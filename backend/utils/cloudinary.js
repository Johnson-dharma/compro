const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image to Cloudinary
const uploadToCloudinary = async (imageBuffer, options = {}) => {
  try {
    const uploadOptions = {
      folder: 'attendance-system',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      ...options
    };

    // Convert buffer to base64 if needed
    let imageData = imageBuffer;
    if (Buffer.isBuffer(imageBuffer)) {
      imageData = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    }

    const result = await cloudinary.uploader.upload(imageData, uploadOptions);
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

// Delete image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      return { success: true, message: 'Image deleted successfully' };
    } else {
      throw new Error('Failed to delete image from Cloudinary');
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

// Get image info from Cloudinary
const getImageInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      createdAt: result.created_at
    };
  } catch (error) {
    console.error('Cloudinary get info error:', error);
    throw new Error('Failed to get image info from Cloudinary');
  }
};

// Generate optimized URL for different use cases
const getOptimizedUrl = (publicId, options = {}) => {
  try {
    const defaultOptions = {
      quality: 'auto:good',
      fetch_format: 'auto',
      ...options
    };

    const transformation = Object.entries(defaultOptions)
      .map(([key, value]) => `${key}_${value}`)
      .join(',');

    return cloudinary.url(publicId, {
      transformation: transformation ? [transformation] : undefined
    });
  } catch (error) {
    console.error('Cloudinary URL generation error:', error);
    throw new Error('Failed to generate optimized URL');
  }
};

// Upload profile picture with face detection
const uploadProfilePicture = async (imageBuffer, userId) => {
  try {
    const uploadOptions = {
      folder: 'attendance-system/profiles',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png'],
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
        { width: 400, height: 400, crop: 'fill', gravity: 'face' }
      ],
      public_id: `profile_${userId}`,
      overwrite: true
    };

    const result = await uploadToCloudinary(imageBuffer, uploadOptions);
    
    return {
      success: true,
      url: result.url,
      publicId: result.publicId,
      thumbnailUrl: getOptimizedUrl(result.publicId, { width: 150, height: 150, crop: 'fill' })
    };
  } catch (error) {
    console.error('Profile picture upload error:', error);
    throw new Error('Failed to upload profile picture');
  }
};

// Upload attendance photo
const uploadAttendancePhoto = async (imageBuffer, userId, type, date) => {
  try {
    const uploadOptions = {
      folder: `attendance-system/attendance/${userId}/${date}`,
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png'],
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
        { width: 800, height: 600, crop: 'limit' }
      ],
      public_id: `${type}_${userId}_${date}_${Date.now()}`,
      overwrite: false
    };

    const result = await uploadToCloudinary(imageBuffer, uploadOptions);
    
    return {
      success: true,
      url: result.url,
      publicId: result.publicId,
      thumbnailUrl: getOptimizedUrl(result.publicId, { width: 200, height: 150, crop: 'fill' })
    };
  } catch (error) {
    console.error('Attendance photo upload error:', error);
    throw new Error('Failed to upload attendance photo');
  }
};

// Clean up old attendance photos (optional maintenance function)
const cleanupOldPhotos = async (daysOld = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // This would require additional Cloudinary API calls to list and delete old resources
    // For now, we'll just return a placeholder
    console.log(`Cleanup function called for photos older than ${daysOld} days`);
    
    return {
      success: true,
      message: `Cleanup scheduled for photos older than ${daysOld} days`
    };
  } catch (error) {
    console.error('Photo cleanup error:', error);
    throw new Error('Failed to cleanup old photos');
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  getImageInfo,
  getOptimizedUrl,
  uploadProfilePicture,
  uploadAttendancePhoto,
  cleanupOldPhotos
};
