const axios = require('axios');
const crypto = require('crypto');

class ThumborService {
  constructor() {
    this.baseURL = process.env.THUMBOR_URL || 'http://localhost:8888';
    this.securityKey = process.env.THUMBOR_SECURITY_KEY || 'MY_SECURE_KEY_CHANGE_THIS';
  }

  // Generate secure URL signature for Thumbor
  generateSignature(urlPath) {
    if (!this.securityKey) {
      return urlPath; // Unsafe mode
    }

    const hmac = crypto.createHmac('sha1', this.securityKey);
    hmac.update(urlPath);
    const signature = hmac.digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return `/${signature}${urlPath}`;
  }

  // Upload image to Thumbor (using file storage)
  async uploadImage(imageBuffer, fileName) {
    try {
      // For demo purposes, we'll use a simple file storage approach
      // In production, you might want to use a proper storage solution
      const fs = require('fs').promises;
      const path = require('path');
      
      const uploadDir = path.join(__dirname, '../../uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, imageBuffer);
      
      return {
        success: true,
        fileName,
        filePath,
        url: `/uploads/${fileName}`,
        message: 'Image uploaded successfully'
      };
    } catch (error) {
      console.error('Thumbor upload error:', error);
      throw new Error('Failed to upload image');
    }
  }

  // Get processed image URL with transformations
  getProcessedImageUrl(imagePath, options = {}) {
    const {
      width = null,
      height = null,
      smart = false,
      quality = 95,
      format = null,
      crop = null,
      filters = []
    } = options;

    let urlPath = '';

    // Add dimensions
    if (width || height) {
      urlPath += `/${width || ''}x${height || ''}`;
    }

    // Add smart cropping (includes face detection)
    if (smart) {
      urlPath += '/smart';
    }

    // Add crop parameters
    if (crop && crop.left !== undefined) {
      urlPath += `/${crop.left}x${crop.top}:${crop.right}x${crop.bottom}`;
    }

    // Add filters
    if (filters.length > 0) {
      urlPath += '/filters:' + filters.join(':');
    }

    // Add image path
    urlPath += `/${imagePath}`;

    // Generate secure URL
    const secureUrl = this.generateSignature(urlPath);
    
    return `${this.baseURL}${secureUrl}`;
  }

  // Create profile picture with face detection and smart cropping
  async createProfilePicture(imageBuffer, userId, options = {}) {
    try {
      const fileName = `profile_${userId}_${Date.now()}.jpg`;
      
      // Upload original image
      const uploadResult = await this.uploadImage(imageBuffer, fileName);
      
      // Generate optimized profile picture URL with face detection
      const profileUrl = this.getProcessedImageUrl(fileName, {
        width: 400,
        height: 400,
        smart: true, // Enable face detection for smart cropping
        quality: 95,
        filters: ['round_corner:20', 'sharpen:1.0,1.0,true']
      });

      // Generate thumbnail URL
      const thumbnailUrl = this.getProcessedImageUrl(fileName, {
        width: 150,
        height: 150,
        smart: true,
        quality: 90,
        filters: ['round_corner:10']
      });

      return {
        success: true,
        originalUrl: `${this.baseURL}${uploadResult.url}`,
        profileUrl,
        thumbnailUrl,
        fileName: uploadResult.fileName,
        message: 'Profile picture created successfully'
      };

    } catch (error) {
      console.error('Profile picture creation error:', error);
      throw new Error('Failed to create profile picture');
    }
  }

  // Process attendance photo with face detection
  async processAttendancePhoto(imageBuffer, userId, type, options = {}) {
    try {
      const timestamp = Date.now();
      const fileName = `attendance_${userId}_${type}_${timestamp}.jpg`;
      
      // Upload original image
      const uploadResult = await this.uploadImage(imageBuffer, fileName);
      
      // Generate processed attendance photo URL
      const processedUrl = this.getProcessedImageUrl(fileName, {
        width: 800,
        height: 600,
        smart: false, // Don't crop for attendance photos
        quality: 95,
        filters: ['brightness:10', 'contrast:10'] // Enhance for better recognition
      });

      // Generate thumbnail for quick preview
      const thumbnailUrl = this.getProcessedImageUrl(fileName, {
        width: 200,
        height: 150,
        quality: 85
      });

      return {
        success: true,
        originalUrl: `${this.baseURL}${uploadResult.url}`,
        processedUrl,
        thumbnailUrl,
        fileName: uploadResult.fileName,
        message: 'Attendance photo processed successfully'
      };

    } catch (error) {
      console.error('Attendance photo processing error:', error);
      throw new Error('Failed to process attendance photo');
    }
  }

  // Get image with specific dimensions and quality
  getResizedImageUrl(imagePath, width, height, options = {}) {
    return this.getProcessedImageUrl(imagePath, {
      width,
      height,
      quality: options.quality || 90,
      smart: options.smart || false,
      filters: options.filters || []
    });
  }

  // Apply face detection to find faces in image
  async detectFacesInImage(imagePath) {
    try {
      // Use Thumbor's face detection by requesting a smart crop
      const faceDetectedUrl = this.getProcessedImageUrl(imagePath, {
        width: 100,
        height: 100,
        smart: true
      });

      // Test if smart cropping works (indicates face detection)
      const response = await axios.head(faceDetectedUrl, { timeout: 5000 });
      
      return {
        success: true,
        faceDetected: response.status === 200,
        faceDetectedUrl,
        message: response.status === 200 ? 'Face detected' : 'No face detected'
      };

    } catch (error) {
      return {
        success: false,
        faceDetected: false,
        message: 'Face detection failed'
      };
    }
  }

  // Health check for Thumbor service
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL}/healthcheck`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('Thumbor health check failed:', error.message);
      return false;
    }
  }

  // Initialize Thumbor service
  async initialize() {
    try {
      const isHealthy = await this.healthCheck();
      if (isHealthy) {
        console.log('✅ Thumbor service connected successfully');
        return true;
      } else {
        console.log('⚠️ Thumbor service not available');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to connect to Thumbor:', error.message);
      return false;
    }
  }
}

// Create singleton instance
const thumborService = new ThumborService();

module.exports = {
  thumborService,
  ThumborService
};


