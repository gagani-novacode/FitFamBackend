import express from 'express';
import { cloudinary, upload } from '../../../config/cloudinary.js';

const router = express.Router();

router.post('/image', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
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

        res.json({
            url: result.secure_url,
            public_id: result.public_id,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;