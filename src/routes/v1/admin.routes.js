import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { param, body } from "express-validator";
import { validationResult } from "express-validator";
import { protect, admin } from "../../middleware/auth.middleware.js";
import {
    getPaidStoreOrders,
    getAnalytics,
    cleanupExpiredOrders,
    getAllOrders,
    updateOrderStatus,
    createProduct,
    updateProduct,
    patchProduct,
} from "../../controllers/store.controller.js";
import { handleImageUpload } from "../../controllers/upload.controller.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
});
const upload = multer({ storage });

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
        return res.status(400).json({ ok: false, errors: errors.array() });
    next();
};

const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

const r = Router();

// Apply protect + admin to ALL routes in this file
r.use(protect, admin);

// --- Products ---
r.post("/products",
    adminLimiter,
    body("name").trim().notEmpty().withMessage("name is required"),
    body("category").trim().isIn(["Men", "Women", "Accessories"]),
    body("price").isNumeric().withMessage("price must be a number"),
    validate,
    createProduct
);

r.put("/products/:id",
    adminLimiter,
    param("id").isMongoId().withMessage("Invalid Product ID"),
    validate,
    updateProduct
);

r.patch("/products/:id",
    adminLimiter,
    param("id").isMongoId().withMessage("Invalid Product ID"),
    validate,
    patchProduct
);

// --- Orders ---
r.get("/orders", adminLimiter, getAllOrders);
r.get("/orders/paid", adminLimiter, getPaidStoreOrders);
r.patch("/orders/:id/status",
    adminLimiter,
    param("id").isMongoId().withMessage("Invalid Order ID"),
    body("status").notEmpty().withMessage("Status is required"),
    validate,
    updateOrderStatus
);

// --- Analytics & Maintenance ---
r.get("/analytics", adminLimiter, getAnalytics);
r.post("/cleanup-expired", adminLimiter, cleanupExpiredOrders);

// --- Uploads ---
r.post("/upload-image", adminLimiter, upload.single("image"), handleImageUpload);

export default r;