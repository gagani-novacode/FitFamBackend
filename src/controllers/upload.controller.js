import { cloudinary, upload } from '../../config/cloudinary.js';
import logger from '../utils/logger.js';

export { upload }; // re-export so your route can use it

export const handleImageUpload = async (req, res) => {
  logger.info("handleImageUpload: START");
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'fitfam', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    logger.info("handleImageUpload: SUCCESS", { url: result.secure_url });
    res.json({ ok: true, url: result.secure_url, public_id: result.public_id });
  } catch (e) {
    logger.error("handleImageUpload: FAILED", { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
};