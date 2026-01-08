const ImageKit = require('imagekit');

let imagekit;

try {
  imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
  });
} catch (error) {
  console.error('ImageKit initialization error:', error);
  // It's a good practice to handle the case where initialization fails,
  // maybe by using a mock/dummy service or by logging a critical error.
}

// Upload image to ImageKit
const uploadToImageKit = async (imageBuffer, options = {}) => {
  if (!imagekit) {
    throw new Error('ImageKit not initialized');
  }

  try {
    const imageData = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer, 'base64');

    const result = await imagekit.upload({
      file: imageData,
      ...options
    });

    return {
      success: true,
      url: result.url,
      publicId: result.fileId, // Note: ImageKit uses fileId
      width: result.width,
      height: result.height,
      format: result.fileType,
      size: result.size
    };
  } catch (error) {
    console.error('ImageKit upload error:', error);
    throw new Error('Failed to upload image to ImageKit');
  }
};

// Delete image from ImageKit
const deleteFromImageKit = async (fileId) => {
  if (!imagekit) {
    throw new Error('ImageKit not initialized');
  }

  try {
    await imagekit.deleteFile(fileId);
    return { success: true, message: 'Image deleted successfully' };
  } catch (error) {
    console.error('ImageKit deletion error:', error);
    throw new Error('Failed to delete image from ImageKit');
  }
};

// Get image info from ImageKit
const getImageInfo = async (fileId) => {
  if (!imagekit) {
    throw new Error('ImageKit not initialized');
  }

  try {
    const result = await imagekit.getFileDetails(fileId);
    
    return {
      success: true,
      url: result.url,
      publicId: result.fileId,
      width: result.width,
      height: result.height,
      format: result.fileType,
      size: result.size,
      createdAt: result.createdAt
    };
  } catch (error) {
    console.error('ImageKit get info error:', error);
    throw new Error('Failed to get image info from ImageKit');
  }
};

// Generate optimized URL for different use cases
const getOptimizedUrl = (path, options = {}) => {
  if (!imagekit) {
    throw new Error('ImageKit not initialized');
  }
  
  try {
    const transformation = [];
    if (options.width) transformation.push({ width: options.width });
    if (options.height) transformation.push({ height: options.height });
    if (options.crop) transformation.push({ crop: options.crop });
    if (options.quality) transformation.push({ quality: options.quality });
    // Add other transformations as needed

    return imagekit.url({
      path,
      transformation
    });
  } catch (error) {
    console.error('ImageKit URL generation error:', error);
    throw new Error('Failed to generate optimized URL');
  }
};

// Upload profile picture with smart face detection
const uploadProfilePicture = async (imageBuffer, userId) => {
  try {
    const uploadOptions = {
      folder: 'attendance-system/profiles',
      fileName: `profile_${userId}`,
      useUniqueFileName: false,
      transformation: [
        {
          height: 400,
          width: 400,
          crop: 'at_max',
        },
      ],
    };

    const result = await uploadToImageKit(imageBuffer, uploadOptions);

    return {
      success: true,
      url: result.url,
      publicId: result.publicId,
      thumbnailUrl: getOptimizedUrl(result.publicId, {
        height: 150,
        width: 150,
        crop: 'at_max',
      }),
    };
  } catch (error) {
    console.error('Profile picture upload error:', error);
    throw new Error('Failed to upload profile picture');
  }
};

// Upload attendance photo
const uploadAttendancePhoto = async (imageBuffer, userId, type, date) => {
  try {
    const formattedDate = date.toISOString().split('T')[0];
    const fileName = `attendance_${userId}_${type}_${formattedDate}`;

    const uploadOptions = {
      folder: 'attendance-system/attendance',
      fileName,
      useUniqueFileName: false,
      transformation: [
        {
          height: 800,
          width: 600,
          crop: 'at_max',
        },
      ],
    };

    const result = await uploadToImageKit(imageBuffer, uploadOptions);

    return {
      success: true,
      url: result.url,
      publicId: result.publicId,
    };
  } catch (error) {
    console.error('Attendance photo upload error:', error);
    throw new Error('Failed to upload attendance photo');
  }
};

// Cleanup old photos (utility function)
const cleanupOldPhotos = async (daysOld = 90) => {
  if (!imagekit) {
    throw new Error('ImageKit not initialized');
  }
  
  try {
    // ImageKit doesn't have direct cleanup API like Cloudinary
    // This would need to be implemented using listFiles and deleteFile
    // For now, we'll log and return success
    console.log(`Cleanup old photos feature not yet implemented for ImageKit`);
    console.log(`Would clean up photos older than ${daysOld} days`);
    
    return {
      success: true,
      message: 'Cleanup functionality needs manual implementation with ImageKit API',
      deletedCount: 0
    };
  } catch (error) {
    console.error('ImageKit cleanup error:', error);
    throw new Error('Failed to cleanup old photos');
  }
};

module.exports = {
  imagekit,
  uploadToImageKit,
  deleteFromImageKit,
  getImageInfo,
  getOptimizedUrl,
  uploadProfilePicture,
  uploadAttendancePhoto,
  cleanupOldPhotos,
};