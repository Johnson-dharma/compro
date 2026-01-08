const express = require('express');
const { body, validationResult } = require('express-validator');
const { Geofence, User } = require('../models');
const { protect, isAdmin } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all geofences
// @route   GET /api/geofences
// @access  Private (Admin)
router.get('/', [protect, isAdmin], async (req, res) => {
  try {
    const { page = 1, limit = 20, isActive } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const { count, rows } = await Geofence.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email']
      }]
    });

    res.json({
      success: true,
      data: {
        geofences: rows.map(geofence => geofence.toJSON()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get geofences error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Get geofence by ID
// @route   GET /api/geofences/:id
// @access  Private (Admin)
router.get('/:id', [protect, isAdmin], async (req, res) => {
  try {
    const { id } = req.params;

    const geofence = await Geofence.findByPk(id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!geofence) {
      return res.status(404).json({
        success: false,
        error: { message: 'Geofence not found' }
      });
    }

    res.json({
      success: true,
      data: { geofence: geofence.toJSON() }
    });
  } catch (error) {
    console.error('Get geofence error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Create new geofence
// @route   POST /api/geofences
// @access  Private (Admin)
router.post('/', [
  protect,
  isAdmin,
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('type').isIn(['circle', 'polygon']).withMessage('Type must be circle or polygon'),
  body('center').custom((value) => {
    if (!value || typeof value.latitude !== 'number' || typeof value.longitude !== 'number') {
      throw new Error('Center must have valid latitude and longitude');
    }
    if (value.latitude < -90 || value.latitude > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    if (value.longitude < -180 || value.longitude > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
    return true;
  }),
  body('radius').custom((value, { req }) => {
    if (req.body.type === 'circle' && (!value || value <= 0)) {
      throw new Error('Radius is required and must be positive for circle geofences');
    }
    return true;
  }),
  body('coordinates').custom((value, { req }) => {
    if (req.body.type === 'polygon') {
      if (!Array.isArray(value) || value.length < 3) {
        throw new Error('Polygon geofences require at least 3 coordinates');
      }
      for (const coord of value) {
        if (!coord.latitude || !coord.longitude || 
            coord.latitude < -90 || coord.latitude > 90 ||
            coord.longitude < -180 || coord.longitude > 180) {
          throw new Error('Invalid coordinates in polygon');
        }
      }
    }
    return true;
  }),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
  body('timezone').optional().isLength({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const { 
      name, 
      description, 
      type, 
      center, 
      radius, 
      coordinates, 
      color, 
      timezone,
      workingHours 
    } = req.body;

    // Create geofence
    const geofence = await Geofence.create({
      name,
      description,
      type,
      center: type === 'circle' ? center : undefined,
      radius: type === 'circle' ? radius : undefined,
      coordinates: type === 'polygon' ? coordinates : undefined,
      color: color || '#007BFF',
      timezone: timezone || 'UTC',
      workingHours,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: {
        geofence: geofence.toJSON(),
        message: 'Geofence created successfully'
      }
    });
  } catch (error) {
    console.error('Create geofence error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during geofence creation' }
    });
  }
});

// @desc    Update geofence
// @route   PUT /api/geofences/:id
// @access  Private (Admin)
router.put('/:id', [
  protect,
  isAdmin,
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('center').custom((value) => {
    if (value) {
      if (typeof value.latitude !== 'number' || typeof value.longitude !== 'number') {
        throw new Error('Center must have valid latitude and longitude');
      }
      if (value.latitude < -90 || value.latitude > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      if (value.longitude < -180 || value.longitude > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
    }
    return true;
  }),
  body('radius').optional().isFloat({ min: 0.01 }).withMessage('Radius must be positive'),
  body('coordinates').custom((value) => {
    if (value) {
      if (!Array.isArray(value) || value.length < 3) {
        throw new Error('Polygon geofences require at least 3 coordinates');
      }
      for (const coord of value) {
        if (!coord.latitude || !coord.longitude || 
            coord.latitude < -90 || coord.latitude > 90 ||
            coord.longitude < -180 || coord.longitude > 180) {
          throw new Error('Invalid coordinates in polygon');
        }
      }
    }
    return true;
  }),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('timezone').optional().isLength({ min: 1, max: 50 })
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
    const { 
      name, 
      description, 
      center, 
      radius, 
      coordinates, 
      color, 
      timezone,
      workingHours 
    } = req.body;

    const geofence = await Geofence.findByPk(id);
    if (!geofence) {
      return res.status(404).json({
        success: false,
        error: { message: 'Geofence not found' }
      });
    }

    // Update geofence
    await geofence.update({
      name: name || geofence.name,
      description: description !== undefined ? description : geofence.description,
      center: center || geofence.center,
      radius: radius || geofence.radius,
      coordinates: coordinates || geofence.coordinates,
      color: color || geofence.color,
      timezone: timezone || geofence.timezone,
      workingHours: workingHours || geofence.workingHours
    });

    res.json({
      success: true,
      data: {
        geofence: geofence.toJSON(),
        message: 'Geofence updated successfully'
      }
    });
  } catch (error) {
    console.error('Update geofence error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during geofence update' }
    });
  }
});

// @desc    Toggle geofence active status
// @route   PATCH /api/geofences/:id/status
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

    const geofence = await Geofence.findByPk(id);
    if (!geofence) {
      return res.status(404).json({
        success: false,
        error: { message: 'Geofence not found' }
      });
    }

    await geofence.update({ isActive });

    res.json({
      success: true,
      data: {
        geofence: geofence.toJSON(),
        message: `Geofence ${isActive ? 'activated' : 'deactivated'} successfully`
      }
    });
  } catch (error) {
    console.error('Toggle geofence status error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during status update' }
    });
  }
});

// @desc    Delete geofence
// @route   DELETE /api/geofences/:id
// @access  Private (Admin)
router.delete('/:id', [protect, isAdmin], async (req, res) => {
  try {
    const { id } = req.params;

    const geofence = await Geofence.findByPk(id);
    if (!geofence) {
      return res.status(404).json({
        success: false,
        error: { message: 'Geofence not found' }
      });
    }

    await geofence.destroy();

    res.json({
      success: true,
      data: { message: 'Geofence deleted successfully' }
    });
  } catch (error) {
    console.error('Delete geofence error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during deletion' }
    });
  }
});

// @desc    Test location against geofence
// @route   POST /api/geofences/:id/test
// @access  Private (Admin)
router.post('/:id/test', [
  protect,
  isAdmin,
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required')
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
    const { latitude, longitude } = req.body;

    const geofence = await Geofence.findByPk(id);
    if (!geofence) {
      return res.status(404).json({
        success: false,
        error: { message: 'Geofence not found' }
      });
    }

    const isInside = geofence.isPointInside(latitude, longitude);
    const distance = geofence.getDistanceFromCenter(latitude, longitude);

    res.json({
      success: true,
      data: {
        isInside,
        distance: distance ? Math.round(distance) : null,
        geofence: geofence.toJSON()
      }
    });
  } catch (error) {
    console.error('Test geofence error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during geofence test' }
    });
  }
});

// @desc    Get geofence statistics
// @route   GET /api/geofences/:id/stats
// @access  Private (Admin)
router.get('/:id/stats', [protect, isAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const geofence = await Geofence.findByPk(id);
    if (!geofence) {
      return res.status(404).json({
        success: false,
        error: { message: 'Geofence not found' }
      });
    }

    // This would require additional queries to get attendance data within this geofence
    // For now, return basic geofence info
    const stats = {
      geofenceId: geofence.id,
      name: geofence.name,
      type: geofence.type,
      isActive: geofence.isActive,
      createdAt: geofence.createdAt,
      totalAttendances: 0, // Would need to be calculated from attendance data
      validAttendances: 0,
      invalidAttendances: 0
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get geofence stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

module.exports = router;
