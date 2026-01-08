const express = require('express');
const { body, validationResult } = require('express-validator');
const { Attendance, User } = require('../models');
const { protect, isAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

const router = express.Router();

// @desc    Get attendance summary for dashboard
// @route   GET /api/reports/dashboard
// @access  Private (Admin)
router.get('/dashboard', [protect, isAdmin], async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    // Get today's attendance summary
    const todayAttendances = await Attendance.findAll({
      where: { date: today },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'department']
      }]
    });

    // Get this week's attendance summary
    const weekAttendances = await Attendance.findAll({
      where: {
        date: {
          [Op.gte]: startOfWeekStr
        }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'department']
      }]
    });

    // Get total users count
    const totalUsers = await User.count({ where: { isActive: true } });
    const totalEmployees = await User.count({ where: { role: 'employee', isActive: true } });

    // Calculate today's statistics
    const todayStats = {
      total: todayAttendances.length,
      present: todayAttendances.filter(a => a.status === 'present').length,
      late: todayAttendances.filter(a => a.status === 'late').length,
      absent: totalEmployees - todayAttendances.length,
      remote: todayAttendances.filter(a => a.status === 'remote').length,
      invalid: todayAttendances.filter(a => a.status === 'invalid').length
    };

    // Calculate this week's statistics
    const weekStats = {
      total: weekAttendances.length,
      present: weekAttendances.filter(a => a.status === 'present').length,
      late: weekAttendances.filter(a => a.status === 'late').length,
      absent: (totalEmployees * 5) - weekAttendances.length, // Assuming 5 working days
      remote: weekAttendances.filter(a => a.status === 'remote').length,
      invalid: weekAttendances.filter(a => a.status === 'invalid').length
    };

    // Get recent attendance submissions
    const recentAttendances = await Attendance.findAll({
      where: {
        date: {
          [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'department']
      }]
    });

    // Get department-wise attendance
    const departmentStats = {};
    const departments = await User.findAll({
      where: { role: 'employee', isActive: true },
      attributes: ['department'],
      group: ['department']
    });

    for (const dept of departments) {
      if (dept.department) {
        const deptUsers = await User.count({ where: { department: dept.department, role: 'employee', isActive: true } });
        const deptTodayAttendances = todayAttendances.filter(a => a.user.department === dept.department);
        
        departmentStats[dept.department] = {
          totalUsers: deptUsers,
          present: deptTodayAttendances.filter(a => a.status === 'present').length,
          late: deptTodayAttendances.filter(a => a.status === 'late').length,
          absent: deptUsers - deptTodayAttendances.length
        };
      }
    }

    res.json({
      success: true,
      data: {
        today: todayStats,
        week: weekStats,
        totalUsers,
        totalEmployees,
        recentAttendances: recentAttendances.map(att => att.toJSON()),
        departmentStats
      }
    });
  } catch (error) {
    console.error('Dashboard report error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get detailed attendance report
// @route   GET /api/reports/attendance
// @access  Private (Admin)
router.get('/attendance', [protect, isAdmin], async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      userId, 
      department, 
      departments, // Support multiple departments
      status, 
      page = 1, 
      limit = 50,
      export: exportType 
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Start date and end date are required' }
      });
    }

    const offset = (page - 1) * limit;
    const whereClause = {
      date: {
        [Op.between]: [startDate, endDate]
      }
    };

    if (userId) {
      whereClause.userId = userId;
    }

    if (status) {
      whereClause.status = status;
    }

    // Handle department filtering - support both single department and multiple departments
    let departmentFilter = undefined;
    if (department) {
      departmentFilter = { department };
    } else if (departments) {
      // Handle multiple departments - departments can be a string or array
      const deptArray = Array.isArray(departments) ? departments : departments.split(',');
      departmentFilter = { 
        department: { 
          [Op.in]: deptArray 
        } 
      };
    }

    // Get attendances with user information
    const { count, rows } = await Attendance.findAndCountAll({
      where: whereClause,
      order: [['date', 'DESC'], ['clockInTime', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'department'],
        where: departmentFilter
      }]
    });

    // Calculate summary statistics
    const allAttendances = await Attendance.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'department'],
        where: departmentFilter
      }]
    });

    const summary = {
      total: allAttendances.length,
      present: allAttendances.filter(a => a.status === 'present').length,
      late: allAttendances.filter(a => a.status === 'late').length,
      absent: allAttendances.filter(a => a.status === 'absent').length,
      remote: allAttendances.filter(a => a.status === 'remote').length,
      invalid: allAttendances.filter(a => a.status === 'invalid').length,
      totalWorkingHours: allAttendances.reduce((sum, a) => sum + (a.workingHours || 0), 0),
      totalOvertimeHours: allAttendances.reduce((sum, a) => sum + (a.overtimeHours || 0), 0),
      averageWorkingHours: allAttendances.length > 0 ? 
        (allAttendances.reduce((sum, a) => sum + (a.workingHours || 0), 0) / allAttendances.length).toFixed(2) : 0
    };

    // If export is requested, return CSV or Excel format
    if (exportType === 'csv') {
      const csvData = generateCSV(allAttendances);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${startDate}_${endDate}.csv`);
      return res.send(csvData);
    }

    if (exportType === 'excel') {
      const excelData = await generateExcel(allAttendances);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${startDate}_${endDate}.xlsx`);
      return res.send(excelData);
    }

    res.json({
      success: true,
      data: {
        attendances: rows.map(att => att.toJSON()),
        summary,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get user attendance report
// @route   GET /api/reports/user/:userId
// @access  Private (Admin or self)
router.get('/user/:userId', [protect], async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Check if user can access this report
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized to access this report' }
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Start date and end date are required' }
      });
    }

    const whereClause = {
      userId,
      date: {
        [Op.between]: [startDate, endDate]
      }
    };

    const attendances = await Attendance.findAll({
      where: whereClause,
      order: [['date', 'ASC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'department']
      }]
    });

    // Calculate user statistics
    const stats = {
      totalDays: attendances.length,
      present: attendances.filter(a => a.status === 'present').length,
      late: attendances.filter(a => a.status === 'late').length,
      absent: attendances.filter(a => a.status === 'absent').length,
      remote: attendances.filter(a => a.status === 'remote').length,
      totalWorkingHours: attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0),
      totalOvertimeHours: attendances.reduce((sum, a) => sum + (a.overtimeHours || 0), 0),
      averageWorkingHours: attendances.length > 0 ? 
        (attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0) / attendances.length).toFixed(2) : 0,
      attendanceRate: attendances.length > 0 ? 
        ((attendances.filter(a => a.status === 'present' || a.status === 'late').length / attendances.length) * 100).toFixed(2) : 0
    };

    // Get daily breakdown
    const dailyBreakdown = attendances.map(att => ({
      date: att.date,
      status: att.status,
      clockInTime: att.clockInTime,
      clockOutTime: att.clockOutTime,
      workingHours: att.workingHours,
      overtimeHours: att.overtimeHours,
      locationStatus: att.locationStatus
    }));

    res.json({
      success: true,
      data: {
        userId,
        user: attendances[0]?.user || null,
        stats,
        dailyBreakdown,
        attendances: attendances.map(att => att.toJSON())
      }
    });
  } catch (error) {
    console.error('User report error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get department attendance report
// @route   GET /api/reports/department/:department
// @access  Private (Admin)
router.get('/department/:department', [protect, isAdmin], async (req, res) => {
  try {
    const { department } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Start date and end date are required' }
      });
    }

    // Get all users in the department
    const departmentUsers = await User.findAll({
      where: { department, role: 'employee', isActive: true },
      attributes: ['id', 'name', 'email']
    });

    const userIds = departmentUsers.map(user => user.id);

    // Get attendances for all users in the department
    const attendances = await Attendance.findAll({
      where: {
        userId: { [Op.in]: userIds },
        date: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });

    // Calculate department statistics
    const stats = {
      totalUsers: departmentUsers.length,
      totalDays: attendances.length,
      present: attendances.filter(a => a.status === 'present').length,
      late: attendances.filter(a => a.status === 'late').length,
      absent: attendances.filter(a => a.status === 'absent').length,
      remote: attendances.filter(a => a.status === 'remote').length,
      totalWorkingHours: attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0),
      totalOvertimeHours: attendances.reduce((sum, a) => sum + (a.overtimeHours || 0), 0),
      averageWorkingHours: attendances.length > 0 ? 
        (attendances.reduce((sum, a) => sum + (a.workingHours || 0), 0) / attendances.length).toFixed(2) : 0
    };

    // Get user-wise breakdown
    const userBreakdown = departmentUsers.map(user => {
      const userAttendances = attendances.filter(a => a.userId === user.id);
      const userStats = {
        userId: user.id,
        name: user.name,
        email: user.email,
        totalDays: userAttendances.length,
        present: userAttendances.filter(a => a.status === 'present').length,
        late: userAttendances.filter(a => a.status === 'late').length,
        absent: userAttendances.filter(a => a.status === 'absent').length,
        totalWorkingHours: userAttendances.reduce((sum, a) => sum + (a.workingHours || 0), 0),
        attendanceRate: userAttendances.length > 0 ? 
          ((userAttendances.filter(a => a.status === 'present' || a.status === 'late').length / userAttendances.length) * 100).toFixed(2) : 0
      };
      return userStats;
    });

    res.json({
      success: true,
      data: {
        department,
        stats,
        userBreakdown,
        attendances: attendances.map(att => att.toJSON())
      }
    });
  } catch (error) {
    console.error('Department report error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Export attendance report
// @route   GET /api/reports/attendance/export
// @access  Private (Admin)
router.get('/attendance/export', [protect, isAdmin], async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      userId, 
      department, 
      departments,
      status, 
      format = 'excel'
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Start date and end date are required' }
      });
    }

    const whereClause = {
      date: {
        [Op.between]: [startDate, endDate]
      }
    };

    if (userId) {
      whereClause.userId = userId;
    }

    if (status) {
      whereClause.status = status;
    }

    // Handle department filtering
    let departmentFilter = undefined;
    if (department) {
      departmentFilter = { department };
    } else if (departments) {
      const deptArray = Array.isArray(departments) ? departments : departments.split(',');
      departmentFilter = { 
        department: { 
          [Op.in]: deptArray 
        } 
      };
    }

    // Get all attendances for export
    const attendances = await Attendance.findAll({
      where: whereClause,
      order: [['date', 'DESC'], ['clockInTime', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'department'],
        where: departmentFilter
      }]
    });

    if (format === 'excel') {
      const excelData = await generateExcel(attendances);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${startDate}_${endDate}.xlsx`);
      return res.send(excelData);
    } else if (format === 'csv') {
      const csvData = generateCSV(attendances);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${startDate}_${endDate}.csv`);
      return res.send(csvData);
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid format. Use excel or csv.' }
      });
    }
  } catch (error) {
    console.error('Export attendance report error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during export' }
    });
  }
});

// Helper function to generate CSV
const generateCSV = (attendances) => {
  const headers = [
    'Date',
    'Employee Name',
    'Employee Email',
    'Department',
    'Status',
    'Clock In Time',
    'Clock Out Time',
    'Working Hours',
    'Overtime Hours',
    'Location Status',
    'Notes'
  ].join(',');

  const rows = attendances.map(att => [
    att.date,
    `"${att.user.name}"`,
    att.user.email,
    att.user.department || '',
    att.status,
    att.clockInTime ? new Date(att.clockInTime).toLocaleString() : '',
    att.clockOutTime ? new Date(att.clockOutTime).toLocaleString() : '',
    att.workingHours || '',
    att.overtimeHours || '',
    att.locationStatus,
    `"${att.notes || ''}"`
  ].join(','));

  return [headers, ...rows].join('\n');
};

// Helper function to generate Excel
const generateExcel = async (attendances) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance Report');

  // Add headers
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Employee Name', key: 'employeeName', width: 25 },
    { header: 'Employee Email', key: 'employeeEmail', width: 30 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Clock In Time', key: 'clockInTime', width: 20 },
    { header: 'Clock Out Time', key: 'clockOutTime', width: 20 },
    { header: 'Working Hours', key: 'workingHours', width: 15 },
    { header: 'Overtime Hours', key: 'overtimeHours', width: 15 },
    { header: 'Location Status', key: 'locationStatus', width: 15 },
    { header: 'Notes', key: 'notes', width: 30 }
  ];

  // Add data rows
  attendances.forEach(att => {
    worksheet.addRow({
      date: att.date,
      employeeName: att.user.name,
      employeeEmail: att.user.email,
      department: att.user.department || '',
      status: att.status,
      clockInTime: att.clockInTime ? new Date(att.clockInTime).toLocaleString() : '',
      clockOutTime: att.clockOutTime ? new Date(att.clockOutTime).toLocaleString() : '',
      workingHours: att.workingHours || '',
      overtimeHours: att.overtimeHours || '',
      locationStatus: att.locationStatus,
      notes: att.notes || ''
    });
  });

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = Math.max(column.width, 10);
  });

  return await workbook.xlsx.writeBuffer();
};

module.exports = router;
