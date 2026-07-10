import { uploadImage } from '../utils/cloudinary.util.js';
import logger from '../utils/logger.js';

export const handleImageUpload = async (req, res) => {
  logger.info("handleImageUpload: START");
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    const url = await uploadImage(dataURI, 'saraku-products');
    
    logger.info("handleImageUpload: SUCCESS", { url });
    res.json({ ok: true, url });
  } catch (e) {
    logger.error("handleImageUpload: FAILED", { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
};
