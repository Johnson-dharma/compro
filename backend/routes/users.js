const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { User, Attendance, sequelize } = require('../models');
const { protect, isAdmin, isAdminOrSelf } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');

const router = express.Router();

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
router.get('/', [protect, isAdmin], async (req, res) => {
  try {
    const { page = 1, limit = 20, role, department, search } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (role) {
      whereClause.role = role;
    }
    
    if (department) {
      whereClause.department = department;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      data: {
        users: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin or self)
router.get('/:id', [protect, isAdminOrSelf], async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Attendance,
        as: 'attendances',
        limit: 10,
        order: [['date', 'DESC']],
        attributes: ['id', 'date', 'status', 'clockInTime', 'clockOutTime', 'workingHours']
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Create new user (Admin only)
// @route   POST /api/users
// @access  Private (Admin)
router.post('/', [
  protect,
  isAdmin,
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').isIn(['admin', 'employee']).withMessage('Role must be admin or employee'),
  body('department').optional().trim().isLength({ min: 2, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const { name, email, password, role, department } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { message: 'User with this email already exists' }
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      department,
      emailVerified: true
    });

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        message: 'User created successfully'
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during user creation' }
    });
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or self)
router.put('/:id', [
  protect,
  isAdminOrSelf,
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('department').optional().trim().isLength({ min: 2, max: 100 }),
  body('role').optional().isIn(['admin', 'employee']),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
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
    const { name, department, role, password } = req.body;

    // Only admins can change roles
    if (role && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Only admins can change user roles' }
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Prepare update data
    const updateData = {
      name: name || user.name,
      department: department || user.department
    };

    // Only update role if provided and user is admin
    if (role && req.user.role === 'admin') {
      updateData.role = role;
    }

    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Update user
    await user.update(updateData);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      data: {
        user: userResponse,
        message: 'User updated successfully'
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during update' }
    });
  }
});

// @desc    Update user profile picture
// @route   PUT /api/users/:id/profile-picture
// @access  Private (Admin or self)
router.put('/:id/profile-picture', [protect, isAdminOrSelf], async (req, res) => {
  try {
    const { id } = req.params;
    const { photoUrl } = req.body;

    if (!photoUrl) {
      return res.status(400).json({
        success: false,
        error: { message: 'Photo URL is required' }
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Update profile picture
    await user.update({ profilePictureUrl: photoUrl });

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      data: {
        user: userResponse,
        message: 'Profile picture updated successfully'
      }
    });
  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during profile picture update' }
    });
  }
});

// @desc    Deactivate/Activate user (Admin only)
// @route   PATCH /api/users/:id/status
// @access  Private (Admin)
router.patch('/:id/status', [protect, isAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { message: 'isActive must be a boolean value' }
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Prevent deactivating self
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot deactivate your own account' }
      });
    }

    await user.update({ isActive });

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      data: {
        user: userResponse,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during status update' }
    });
  }
});

// @desc    Delete user and all associated data (Admin only)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
router.delete('/:id', [protect, isAdmin], async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findByPk(id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Prevent deleting self
    if (id === req.user.id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot delete your own account' }
      });
    }

    // Delete all attendance records for this user
    const deletedAttendances = await Attendance.destroy({
      where: { userId: id },
      transaction,
      force: true
    });

    console.log(`Deleted ${deletedAttendances} attendance records for user ${id}`);

    // Delete the user
    await User.destroy({
      where: { id },
      transaction,
      force: true
    });

    await transaction.commit();

    res.json({
      success: true,
      data: { 
        message: 'User and all associated attendance records permanently deleted successfully',
        deletedAttendances
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Delete user error:', error);
    
    // Handle foreign key constraint error
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Cannot delete user. There are still references to this user in other tables.',
          details: 'Please contact system administrator for assistance.'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Server error during user deletion' }
    });
  }
});

// @desc    Get user statistics (Admin only)
// @route   GET /api/users/:id/stats
// @access  Private (Admin)
router.get('/:id/stats', [protect, isAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Verify user exists
    const user = await User.findByPk(id, { attributes: ['id'] });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    const whereClause = { userId: id };
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const attendances = await Attendance.findAll({
      where: whereClause,
      attributes: [
        'status',
        'workingHours',
        'overtimeHours',
        'locationStatus'
      ]
    });

    // Calculate statistics
    const totalWorkingHours = attendances.reduce((sum, a) => sum + (parseFloat(a.workingHours) || 0), 0);
    const totalOvertimeHours = attendances.reduce((sum, a) => sum + (parseFloat(a.overtimeHours) || 0), 0);
    
    const stats = {
      totalDays: attendances.length,
      present: attendances.filter(a => a.status === 'present').length,
      absent: attendances.filter(a => a.status === 'absent').length,
      late: attendances.filter(a => a.status === 'late').length,
      remote: attendances.filter(a => a.status === 'remote').length,
      totalWorkingHours,
      totalOvertimeHours,
      averageWorkingHours: attendances.length > 0 ? 
        (totalWorkingHours / attendances.length).toFixed(2) : 0,
      validLocations: attendances.filter(a => a.locationStatus === 'valid').length,
      remoteLocations: attendances.filter(a => a.locationStatus === 'remote').length
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get current user profile
// @route   GET /api/users/profile/me
// @access  Private
router.get('/profile/me', protect, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Attendance,
        as: 'attendances',
        limit: 7,
        order: [['date', 'DESC']],
        attributes: ['id', 'date', 'status', 'clockInTime', 'clockOutTime', 'workingHours']
      }]
    });

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Update current user profile
// @route   PUT /api/users/profile/me
// @access  Private
router.put('/profile/me', [
  protect,
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('department').optional().trim().isLength({ min: 2, max: 100 }),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const { name, department, password } = req.body;

    const user = await User.findByPk(req.user.id);
    
    // Prepare update data
    const updateData = {
      name: name || user.name,
      department: department || user.department
    };

    // Update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Update user
    await user.update(updateData);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      data: {
        user: userResponse,
        message: 'Profile updated successfully'
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during profile update' }
    });
  }
});

// @desc    Export users
// @route   GET /api/users/export
// @access  Private (Admin)
router.get('/export', [protect, isAdmin], async (req, res) => {
  try {
    const { format = 'excel', role, department } = req.query;

    const whereClause = {};
    if (role) whereClause.role = role;
    if (department) whereClause.department = department;

    const users = await User.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'role', 'department', 'isActive', 'createdAt']
    });

    if (format === 'excel') {
      // Create workbook & worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Users');

      // Add headers
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Role', key: 'role', width: 15 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Active', key: 'isActive', width: 10 },
        { header: 'Created At', key: 'createdAt', width: 25 }
      ];

      // Add data rows
      users.forEach(user => {
        worksheet.addRow({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department || '',
          isActive: user.isActive ? 'Yes' : 'No',
          createdAt: user.createdAt.toLocaleString()
        });
      });

      // Style headers
      worksheet.getRow(1).font = { bold: true };

      res.setHeader(
        'Content-Disposition',
        'attachment; filename="users_export.xlsx"'
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      await workbook.xlsx.write(res);
      res.end();
    } else if (format === 'csv') {
      const csvHeaders = ['ID', 'Name', 'Email', 'Role', 'Department', 'Active', 'Created At'];
      const csvRows = users.map(user => [
        user.id,
        `"${user.name}"`,
        user.email,
        user.role,
        `"${user.department || ''}"`,
        user.isActive ? 'Yes' : 'No',
        user.createdAt.toISOString()
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.join(','))
        .join('\n');

      res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csvContent);
    } else {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Invalid format. Use excel or csv.' } 
      });
    }
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during export' }
    });
  }
});

// @desc    Bulk delete users (Admin only)
// @route   POST /api/users/bulk-delete
// @access  Private (Admin)
router.post('/bulk-delete', [protect, isAdmin], async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: { message: 'User IDs array is required' }
      });
    }

    // Prevent self-deletion
    if (userIds.includes(req.user.id)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot delete your own account' }
      });
    }

    let totalDeleted = 0;
    const results = [];

    for (const userId of userIds) {
      try {
        // Delete attendance records first
        const deletedAttendances = await Attendance.destroy({
          where: { userId },
          transaction,
          force: true
        });

        // Delete user
        const deletedUser = await User.destroy({
          where: { id: userId },
          transaction,
          force: true
        });

        if (deletedUser) {
          totalDeleted++;
          results.push({
            userId,
            status: 'success',
            deletedAttendances
          });
        } else {
          results.push({
            userId,
            status: 'failed',
            error: 'User not found'
          });
        }
      } catch (error) {
        results.push({
          userId,
          status: 'failed',
          error: error.message
        });
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      data: {
        message: `Successfully deleted ${totalDeleted} users out of ${userIds.length}`,
        results,
        totalDeleted
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Bulk delete users error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during bulk deletion' }
    });
  }
});

module.exports = router;