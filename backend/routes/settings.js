const express = require('express');
const { body, validationResult } = require('express-validator');
const { Setting } = require('../models');
const { protect, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private (Admin)
router.get('/', [protect, isAdmin], async (req, res) => {
  try {
    const { category } = req.query;
    
    const whereClause = {};
    if (category) {
      whereClause.category = category;
    }

    const settings = await Setting.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['key', 'ASC']]
    });

    const formattedSettings = settings.map(setting => ({
      id: setting.id,
      key: setting.key,
      value: setting.getParsedValue(),
      description: setting.description,
      category: setting.category,
      isPublic: setting.isPublic,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt
    }));

    res.json({
      success: true,
      data: { settings: formattedSettings }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get a specific setting
// @route   GET /api/settings/:key
// @access  Private (Admin)
router.get('/:key', [protect, isAdmin], async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await Setting.findOne({ where: { key } });
    if (!setting) {
      return res.status(404).json({
        success: false,
        error: { message: 'Setting not found' }
      });
    }

    res.json({
      success: true,
      data: {
        setting: {
          id: setting.id,
          key: setting.key,
          value: setting.getParsedValue(),
          description: setting.description,
          category: setting.category,
          isPublic: setting.isPublic,
          createdAt: setting.createdAt,
          updatedAt: setting.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Create or update a setting
// @route   PUT /api/settings/:key
// @access  Private (Admin)
router.put('/:key', [
  protect,
  isAdmin,
  body('value').notEmpty().withMessage('Value is required'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('category').optional().trim().isLength({ max: 50 }).withMessage('Category must be less than 50 characters'),
  body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const { key } = req.params;
    const { value, description, category, isPublic } = req.body;

    const setting = await Setting.setSetting(key, value, {
      description,
      category: category || 'general',
      isPublic: isPublic || false
    });

    res.json({
      success: true,
      data: {
        setting: {
          id: setting.id,
          key: setting.key,
          value: setting.getParsedValue(),
          description: setting.description,
          category: setting.category,
          isPublic: setting.isPublic,
          createdAt: setting.createdAt,
          updatedAt: setting.updatedAt
        },
        message: 'Setting updated successfully'
      }
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during setting update' }
    });
  }
});

// @desc    Delete a setting
// @route   DELETE /api/settings/:key
// @access  Private (Admin)
router.delete('/:key', [protect, isAdmin], async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await Setting.findOne({ where: { key } });
    if (!setting) {
      return res.status(404).json({
        success: false,
        error: { message: 'Setting not found' }
      });
    }

    await setting.destroy();

    res.json({
      success: true,
      data: { message: 'Setting deleted successfully' }
    });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during setting deletion' }
    });
  }
});

// @desc    Get attendance settings (public endpoint)
// @route   GET /api/settings/attendance/public
// @access  Public
router.get('/attendance/public', async (req, res) => {
  try {
    const settings = await Setting.findAll({
      where: { 
        category: 'attendance',
        isPublic: true 
      }
    });

    const formattedSettings = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.getParsedValue();
      return acc;
    }, {});

    res.json({
      success: true,
      data: { settings: formattedSettings }
    });
  } catch (error) {
    console.error('Get public attendance settings error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

module.exports = router;
