import { v2 as cloudinary } from 'cloudinary';
import logger from './logger.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary
 * @param {string} file - Base64 string or file path
 * @param {string} folder - Target folder in Cloudinary
 */
export const uploadImage = async (file, folder = 'saraku-store') => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: folder,
    });
    return result.secure_url;
  } catch (error) {
    logger.error('Cloudinary upload failed:', error);
    throw new Error('Image upload failed');
  }
};

export default cloudinary;
