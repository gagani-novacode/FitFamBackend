import path from 'path';
import logger from '../utils/logger.js';

export const handleImageUpload = async (req, res) => {
  logger.info("handleImageUpload: START");
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    // Build the public URL for the saved file
    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 8080}`;
    const url = `${baseUrl}/uploads/${req.file.filename}`;

    logger.info("handleImageUpload: SUCCESS", { url });
    res.json({ ok: true, url });
  } catch (e) {
    logger.error("handleImageUpload: FAILED", { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
};