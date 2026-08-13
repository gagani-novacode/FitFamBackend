import { Router } from "express";
import rateLimit from "express-rate-limit";
import { param, body } from "express-validator";
import { validationResult } from "express-validator";
import { protect, admin } from "../../middleware/auth.middleware.js";
import { upload } from '../../../config/cloudinary.js';
import { handleImageUpload } from "../../controllers/upload.controller.js";
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

import {
    createDiscount,
    getDiscounts,
    toggleDiscount,
    deleteDiscount
} from "../../controllers/discount.controller.js";

// --- Discounts ---
r.get("/discounts", adminLimiter, getDiscounts);
r.post("/discounts", adminLimiter, validate, createDiscount);
r.put("/discounts/:id/toggle", adminLimiter, validate, toggleDiscount);
r.delete("/discounts/:id", adminLimiter, validate, deleteDiscount);

// --- Uploads ---
r.post("/upload-image", adminLimiter, upload.single("image"), handleImageUpload);

import {
    getSales,
    getSaleById,
    createSale,
    updateSale,
    deleteSale,
} from "../../controllers/sale.controller.js";

// --- Sales ---
r.get("/sales", adminLimiter, getSales);
r.get("/sales/:id", adminLimiter, getSaleById);
r.post("/sales", adminLimiter, createSale);
r.put("/sales/:id", adminLimiter, updateSale);
r.delete("/sales/:id", adminLimiter, deleteSale);

export default r;