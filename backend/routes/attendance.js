const express = require('express');
const { body, validationResult } = require('express-validator');
const { Attendance, User } = require('../models');
const { protect, isAdmin, isAdminOrSelf } = require('../middleware/auth');
const { isLateTime, getAttendanceSettings } = require('../utils/settings');
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');

const router = express.Router();

// Helper function to validate base64 photo data
const validatePhotoData = (photoData) => {
  if (!photoData || typeof photoData !== 'string') {
    return false;
  }
  
  // Check if it's a valid base64 image
  const base64Regex = /^data:image\/(jpeg|jpg|png|gif);base64,/;
  return base64Regex.test(photoData);
};

// @desc    Clock in with photo submission
// @route   POST /api/attendance/clock-in
// @access  Private (Employees)
router.post('/clock-in', [
  protect,
  body('photoData').notEmpty().withMessage('Photo data is required'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const { photoData, latitude, longitude, notes } = req.body;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Validate photo data
    if (!validatePhotoData(photoData)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid photo format. Must be a valid base64 image.' }
      });
    }

    // Check if already clocked in today
    const existingAttendance = await Attendance.findOne({
      where: { userId, date: today }
    });

    if (existingAttendance && existingAttendance.clockInTime) {
      return res.status(400).json({
        success: false,
        error: { message: 'Already clocked in today' }
      });
    }

    // Determine status based on configurable late time settings
    const now = new Date();
    const isLate = await isLateTime(now);
    let status = isLate ? 'late' : 'present';

    // Create or update attendance record (pending admin approval)
    let attendance;
    if (existingAttendance) {
      attendance = await existingAttendance.update({
        clockInTime: now,
        clockInPhotoData: photoData,
        clockInLocation: latitude && longitude ? { latitude, longitude } : null,
        status,
        approvalStatus: 'pending',
        notes: notes || existingAttendance.notes
      });
    } else {
      attendance = await Attendance.create({
        userId,
        date: today,
        clockInTime: now,
        clockInPhotoData: photoData,
        clockInLocation: latitude && longitude ? { latitude, longitude } : null,
        status,
        approvalStatus: 'pending',
        notes
      });
    }

    res.status(201).json({
      success: true,
      data: {
        attendance: {
          ...attendance.toJSON(),
          clockInPhotoData: undefined // Don't send photo data back in response
        },
        message: 'Clock-in submitted successfully. Pending admin approval.'
      }
    });
  } catch (error) {
    console.error('Clock-in error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during clock-in' }
    });
  }
});

// @desc    Clock out with photo submission
// @route   POST /api/attendance/clock-out
// @access  Private (Employees)
router.post('/clock-out', [
  protect,
  body('photoData').notEmpty().withMessage('Photo data is required'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const { photoData, latitude, longitude, notes } = req.body;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Validate photo data
    if (!validatePhotoData(photoData)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid photo format. Must be a valid base64 image.' }
      });
    }

    // Check if clocked in today
    const attendance = await Attendance.findOne({
      where: { userId, date: today }
    });

    if (!attendance || !attendance.clockInTime) {
      return res.status(400).json({
        success: false,
        error: { message: 'Must clock in before clocking out' }
      });
    }

    if (attendance.clockOutTime) {
      return res.status(400).json({
        success: false,
        error: { message: 'Already clocked out today' }
      });
    }

    // Update attendance record
    await attendance.update({
      clockOutTime: new Date(),
      clockOutPhotoData: photoData,
      clockOutLocation: latitude && longitude ? { latitude, longitude } : null,
      notes: notes || attendance.notes,
      approvalStatus: 'pending' // Reset to pending for admin review
    });

    // Refresh to get calculated fields
    await attendance.reload();

    res.json({
      success: true,
      data: {
        attendance: {
          ...attendance.toJSON(),
          clockInPhotoData: undefined,
          clockOutPhotoData: undefined // Don't send photo data back
        },
        workingHours: attendance.getWorkingHours(),
        message: 'Clock-out submitted successfully. Pending admin approval.'
      }
    });
  } catch (error) {
    console.error('Clock-out error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during clock-out' }
    });
  }
});

// @desc    Get current day attendance status
// @route   GET /api/attendance/status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({
      where: { userId, date: today }
    });

    if (!attendance) {
      return res.json({
        success: true,
        data: {
          status: 'not_started',
          message: 'No attendance record for today'
        }
      });
    }

    const status = attendance.isClockedIn() ? 'clocked_in' : 
                   attendance.isClockedOut() ? 'clocked_out' : 'not_started';

    res.json({
      success: true,
      data: {
        status,
        attendance: attendance.toJSON(),
        workingHours: attendance.getWorkingHours()
      }
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get attendance history
// @route   GET /api/attendance/history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = { userId };
    
    if (startDate && endDate) {
      whereClause.date = {
        [require('sequelize').Op.between]: [startDate, endDate]
      };
    }

    const { count, rows } = await Attendance.findAndCountAll({
      where: whereClause,
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });

    res.json({
      success: true,
      data: {
        attendances: rows.map(att => att.toJSON()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get all attendance records (Admin only)
// @route   GET /api/attendance/all
// @access  Private (Admin)
router.get('/all', [protect, isAdmin], async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, userId, status } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.date = {
        [require('sequelize').Op.between]: [startDate, endDate]
      };
    }
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const { count, rows } = await Attendance.findAndCountAll({
      where: whereClause,
      order: [['date', 'DESC'], ['clockInTime', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'department']
      }]
    });

    res.json({
      success: true,
      data: {
        attendances: rows.map(att => att.toJSON()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Manual attendance entry (Admin only)
// @route   POST /api/attendance/manual
// @access  Private (Admin)
router.post('/manual', [
  protect,
  isAdmin,
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('date').isDate().withMessage('Valid date is required'),
  body('clockInTime').optional().isISO8601().withMessage('Valid clock-in time is required'),
  body('clockOutTime').optional().isISO8601().withMessage('Valid clock-out time is required'),
  body('status').isIn(['present', 'absent', 'late', 'remote']).withMessage('Valid status is required'),
  body('reason').notEmpty().withMessage('Reason for manual entry is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const { userId, date, clockInTime, clockOutTime, status, reason } = req.body;

    // Check if attendance record already exists for this date
    let attendance = await Attendance.findOne({
      where: { userId, date }
    });

    if (attendance) {
      // Update existing record
      attendance = await attendance.update({
        clockInTime: clockInTime || attendance.clockInTime,
        clockOutTime: clockOutTime || attendance.clockOutTime,
        status,
        isManualEntry: true,
        manualEntryReason: reason
      });
    } else {
      // Create new record
      attendance = await Attendance.create({
        userId,
        date,
        clockInTime,
        clockOutTime,
        status,
        isManualEntry: true,
        manualEntryReason: reason
      });
    }

    res.status(201).json({
      success: true,
      data: {
        attendance: attendance.toJSON(),
        message: 'Manual attendance entry created successfully'
      }
    });
  } catch (error) {
    console.error('Manual attendance error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during manual entry' }
    });
  }
});

// @desc    Update attendance record (Admin only)
// @route   PUT /api/attendance/:id
// @access  Private (Admin)
router.put('/:id', [protect, isAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const { clockInTime, clockOutTime, status, notes } = req.body;

    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: { message: 'Attendance record not found' }
      });
    }

    await attendance.update({
      clockInTime: clockInTime || attendance.clockInTime,
      clockOutTime: clockOutTime || attendance.clockOutTime,
      status: status || attendance.status,
      notes: notes || attendance.notes
    });

    // Refresh to get calculated fields
    await attendance.reload();

    res.json({
      success: true,
      data: {
        attendance: attendance.toJSON(),
        message: 'Attendance record updated successfully'
      }
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during update' }
    });
  }
});

// @desc    Delete attendance record (Admin only)
// @route   DELETE /api/attendance/:id
// @access  Private (Admin)
router.delete('/:id', [protect, isAdmin], async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: { message: 'Attendance record not found' }
      });
    }

    await attendance.destroy();

    res.json({
      success: true,
      data: { message: 'Attendance record deleted successfully' }
    });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during deletion' }
    });
  }
});

// @desc    Get pending attendance records for admin review
// @route   GET /api/attendance/pending
// @access  Private (Admin)
router.get('/pending', [protect, isAdmin], async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await Attendance.findAndCountAll({
      where: { approvalStatus: 'pending' },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'department']
      }]
    });

    res.json({
      success: true,
      data: {
        attendances: rows.map(att => ({
          ...att.toJSON(),
          // Include photo data for admin review
          hasClockInPhoto: !!att.clockInPhotoData,
          hasClockOutPhoto: !!att.clockOutPhotoData
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get pending attendance error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get attendance photo for admin review
// @route   GET /api/attendance/:id/photo/:type
// @access  Private (Admin)
router.get('/:id/photo/:type', [protect, isAdmin], async (req, res) => {
  try {
    const { id, type } = req.params;

    if (!['clockin', 'clockout'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid photo type. Must be clockin or clockout.' }
      });
    }

    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: { message: 'Attendance record not found' }
      });
    }

    const photoData = type === 'clockin' ? attendance.clockInPhotoData : attendance.clockOutPhotoData;
    
    if (!photoData) {
      return res.status(404).json({
        success: false,
        error: { message: 'Photo not found' }
      });
    }

    res.json({
      success: true,
      data: {
        photoData,
        type,
        attendanceId: id
      }
    });
  } catch (error) {
    console.error('Get photo error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Approve or reject attendance record
// @route   PUT /api/attendance/:id/approval
// @access  Private (Admin)
router.put('/:id/approval', [
  protect,
  isAdmin,
  body('approvalStatus').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('approvalNotes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const { id } = req.params;
    const { approvalStatus, approvalNotes } = req.body;
    const adminId = req.user.id;

    const attendance = await Attendance.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: { message: 'Attendance record not found' }
      });
    }

    await attendance.update({
      approvalStatus,
      approvedBy: adminId,
      approvalNotes: approvalNotes || null
    });

    res.json({
      success: true,
      data: {
        attendance: {
          ...attendance.toJSON(),
          clockInPhotoData: undefined,
          clockOutPhotoData: undefined
        },
        message: `Attendance ${approvalStatus} successfully`
      }
    });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during approval' }
    });
  }
});

// @desc    Export attendance records
// @route   GET /api/attendance/export
// @access  Private (Admin)
router.get('/export', [protect, isAdmin], async (req, res) => {
  try {
    const { 
      format = 'excel',
      startDate, 
      endDate, 
      userId, 
      status 
    } = req.query;

    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const attendances = await Attendance.findAll({
      where: whereClause,
      order: [['date', 'DESC'], ['clockInTime', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'department']
      }]
    });

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Records');

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
        { header: 'Approval Status', key: 'approvalStatus', width: 15 },
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
          approvalStatus: att.approvalStatus,
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

      const excelData = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      return res.send(excelData);
    } else if (format === 'csv') {
      const csvHeaders = [
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
        'Approval Status',
        'Notes'
      ];

      const csvRows = attendances.map(att => [
        att.date,
        `"${att.user.name}"`,
        att.user.email,
        `"${att.user.department || ''}"`,
        att.status,
        att.clockInTime ? new Date(att.clockInTime).toLocaleString() : '',
        att.clockOutTime ? new Date(att.clockOutTime).toLocaleString() : '',
        att.workingHours || '',
        att.overtimeHours || '',
        att.locationStatus,
        att.approvalStatus,
        `"${att.notes || ''}"`
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.join(','))
        .join('\n');

      res.setHeader('Content-Disposition', `attachment; filename=attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
      res.setHeader('Content-Type', 'text/csv');
      res.send(csvContent);
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid format. Use excel or csv.' }
      });
    }
  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during export' }
    });
  }
});

module.exports = router;
