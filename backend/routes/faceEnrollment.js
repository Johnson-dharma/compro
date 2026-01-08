const express = require('express');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { protect, isAdmin, isAdminOrSelf } = require('../middleware/auth');
const { faceRecognitionService } = require('../utils/faceRecognition');
const { thumborService } = require('../utils/thumborService');

const router = express.Router();

// @desc    Enroll employee face for recognition
// @route   POST /api/face-enrollment/enroll
// @access  Private (Admin or self)
router.post('/enroll', [
  protect,
  body('photo').notEmpty().withMessage('Photo is required'),
  body('userId').optional().isUUID().withMessage('Valid user ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const { photo, userId } = req.body;
    const targetUserId = userId || req.user.id;

    // Check if user has permission to enroll this user
    if (targetUserId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' }
      });
    }

    // Get user information
    const user = await User.findByPk(targetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Convert base64 photo to buffer
    let imageBuffer;
    try {
      const base64Data = photo.replace(/^data:image\/[a-z]+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid photo format' }
      });
    }

    // Detect faces in the image first
    let faceDetection;
    try {
      faceDetection = await faceRecognitionService.detectFaces(imageBuffer);
      
      if (faceDetection.faceCount === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'No faces detected in the image. Please provide a clear photo with visible face.' }
        });
      }

      if (faceDetection.faceCount > 1) {
        return res.status(400).json({
          success: false,
          error: { message: 'Multiple faces detected. Please provide a photo with only one person.' }
        });
      }
    } catch (error) {
      console.error('Face detection error:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Face detection failed. Please try again.' }
      });
    }

    // Process image with Thumbor for profile picture
    let processedImage;
    try {
      processedImage = await thumborService.createProfilePicture(imageBuffer, targetUserId);
    } catch (error) {
      console.error('Image processing error:', error);
      // Continue without processed image
      processedImage = { success: false };
    }

    // Enroll face in CompreFace
    let enrollmentResult;
    try {
      enrollmentResult = await faceRecognitionService.enrollEmployeeFace(
        targetUserId,
        imageBuffer,
        user.name
      );
    } catch (error) {
      console.error('Face enrollment error:', error);
      return res.status(500).json({
        success: false,
        error: { message: `Face enrollment failed: ${error.message}` }
      });
    }

    // Update user profile with new profile picture if processing was successful
    if (processedImage.success) {
      try {
        await user.update({
          profilePictureUrl: processedImage.profileUrl,
          faceEnrolled: true,
          faceEnrollmentDate: new Date()
        });
      } catch (error) {
        console.error('Failed to update user profile:', error);
        // Continue without updating profile picture
      }
    }

    res.status(201).json({
      success: true,
      data: {
        message: 'Face enrolled successfully',
        enrollment: {
          userId: targetUserId,
          userName: user.name,
          faceId: enrollmentResult.faceId,
          enrollmentDate: new Date(),
          faceDetection: {
            faceCount: faceDetection.faceCount,
            faces: faceDetection.faces
          }
        },
        profilePicture: processedImage.success ? {
          profileUrl: processedImage.profileUrl,
          thumbnailUrl: processedImage.thumbnailUrl
        } : null
      }
    });

  } catch (error) {
    console.error('Face enrollment error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during face enrollment' }
    });
  }
});

// @desc    Check if user has enrolled face
// @route   GET /api/face-enrollment/status/:userId?
// @access  Private (Admin or self)
router.get('/status/:userId?', [protect], async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId || req.user.id;

    // Check permissions
    if (targetUserId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' }
      });
    }

    // Get user information
    const user = await User.findByPk(targetUserId, {
      attributes: ['id', 'name', 'email', 'profilePictureUrl', 'faceEnrolled', 'faceEnrollmentDate']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Check enrollment status in CompreFace
    let enrollmentStatus = { enrolled: false, subjects: [] };
    try {
      const enrolledEmployees = await faceRecognitionService.getEnrolledEmployees();
      enrollmentStatus = {
        enrolled: enrolledEmployees.employees.includes(targetUserId),
        subjects: enrolledEmployees.employees
      };
    } catch (error) {
      console.error('Failed to check enrollment status:', error);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          profilePictureUrl: user.profilePictureUrl,
          faceEnrolled: user.faceEnrolled || enrollmentStatus.enrolled,
          faceEnrollmentDate: user.faceEnrollmentDate
        },
        enrollmentStatus
      }
    });

  } catch (error) {
    console.error('Get enrollment status error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

// @desc    Remove employee face enrollment
// @route   DELETE /api/face-enrollment/remove/:userId?
// @access  Private (Admin or self)
router.delete('/remove/:userId?', [protect], async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId || req.user.id;

    // Check permissions
    if (targetUserId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' }
      });
    }

    // Get user information
    const user = await User.findByPk(targetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Remove from CompreFace
    try {
      await faceRecognitionService.removeEmployee(targetUserId);
    } catch (error) {
      console.error('Failed to remove from CompreFace:', error);
      // Continue with database update even if CompreFace removal fails
    }

    // Update user record
    await user.update({
      faceEnrolled: false,
      faceEnrollmentDate: null
    });

    res.json({
      success: true,
      data: {
        message: 'Face enrollment removed successfully',
        userId: targetUserId,
        userName: user.name
      }
    });

  } catch (error) {
    console.error('Remove face enrollment error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during removal' }
    });
  }
});

// @desc    Test face recognition with uploaded photo
// @route   POST /api/face-enrollment/test-recognition
// @access  Private
router.post('/test-recognition', [
  protect,
  body('photo').notEmpty().withMessage('Photo is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { message: errors.array()[0].msg }
      });
    }

    const { photo } = req.body;

    // Convert base64 photo to buffer
    let imageBuffer;
    try {
      const base64Data = photo.replace(/^data:image\/[a-z]+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid photo format' }
      });
    }

    // Test face recognition
    const recognitionResult = await faceRecognitionService.recognizeFace(imageBuffer, 0.7);

    // Get user information if recognized
    let recognizedUser = null;
    if (recognitionResult.recognized) {
      recognizedUser = await User.findByPk(recognitionResult.employeeId, {
        attributes: ['id', 'name', 'email', 'profilePictureUrl']
      });
    }

    res.json({
      success: true,
      data: {
        recognition: recognitionResult,
        recognizedUser: recognizedUser ? recognizedUser.toJSON() : null,
        message: recognitionResult.recognized 
          ? `Successfully recognized ${recognizedUser?.name}` 
          : 'No matching face found'
      }
    });

  } catch (error) {
    console.error('Test recognition error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error during recognition test' }
    });
  }
});

// @desc    Get all enrolled employees (Admin only)
// @route   GET /api/face-enrollment/enrolled
// @access  Private (Admin)
router.get('/enrolled', [protect, isAdmin], async (req, res) => {
  try {
    // Get enrolled employees from CompreFace
    const enrolledResult = await faceRecognitionService.getEnrolledEmployees();
    
    // Get user details for enrolled employees
    const enrolledUsers = await User.findAll({
      where: {
        id: enrolledResult.employees
      },
      attributes: ['id', 'name', 'email', 'profilePictureUrl', 'faceEnrolled', 'faceEnrollmentDate']
    });

    res.json({
      success: true,
      data: {
        enrolledEmployees: enrolledUsers.map(user => user.toJSON()),
        totalEnrolled: enrolledResult.count,
        message: `Found ${enrolledResult.count} enrolled employees`
      }
    });

  } catch (error) {
    console.error('Get enrolled employees error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Server error' }
    });
  }
});

module.exports = router;


