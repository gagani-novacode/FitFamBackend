import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { body, query, param } from "express-validator";
import {
  createProduct,
  listProducts,
  updateProduct,
  patchProduct,
  getProductById,
  getCart,
  addToCart,
  removeFromCart,
  updateCartQty,
  moveToCheckout,
  markAsPaid,
  getOrderStatus,
  getMyOrders,
  getPaidStoreOrders,
  getAnalytics,
  cleanupExpiredOrders,
  getAllOrders,
  updateOrderStatus
} from "../../controllers/store.controller.js";
import { handleImageUpload } from "../../controllers/upload.controller.js";
import { validationResult } from "express-validator";

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});
const upload = multer({ storage });

const r = Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }
  next();
};

const limiter = rateLimit({ windowMs: 30 * 1000, max: 60 });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

// --- Products ---
r.get("/products", listProducts);

r.get("/products/:id",
  param("id").isMongoId().withMessage("Invalid Product ID"),
  validate,
  getProductById
);

r.post("/products",
  adminLimiter,
  body("name").trim().notEmpty().withMessage("name is required"),
  body("category").trim().isIn(["Men", "Women", "Accessories"]).withMessage("category must be Men, Women, or Accessories"),
  body("price").isNumeric().withMessage("price must be a number"),
  validate,
  createProduct
);

r.put("/products/:id",
  adminLimiter,
  param("id").isMongoId().withMessage("Invalid Product ID"),
  body("productCode").optional().trim().notEmpty(),
  body("name").optional().trim().notEmpty(),
  body("price").optional().isNumeric(),
  validate,
  updateProduct
);

r.patch("/products/:id",
  adminLimiter,
  param("id").isMongoId().withMessage("Invalid Product ID"),
  validate,
  patchProduct
);

// --- Cart ---
r.get("/cart",
  query("orderRef").optional({ checkFalsy: true }).isUUID().withMessage("Invalid orderRef"),
  validate,
  getCart
);

r.post("/cart/add",
  limiter,
  body("orderRef").isUUID().withMessage("Invalid orderRef"),
  body("productId").isMongoId().withMessage("Invalid Product ID"),
  body("qty").optional().isInt({ min: 1 }).withMessage("Qty must be at least 1"),
  validate,
  addToCart
);

r.post("/cart/remove",
  limiter,
  body("orderRef").isUUID().withMessage("Invalid orderRef"),
  body("productId").isMongoId().withMessage("Invalid Product ID"),
  validate,
  removeFromCart
);

r.post("/cart/update",
  limiter,
  body("orderRef").isUUID().withMessage("Invalid orderRef"),
  body("productId").isMongoId().withMessage("Invalid Product ID"),
  body("qty").isInt({ min: 0 }).withMessage("Qty must be 0 or more"),
  validate,
  updateCartQty
);

// --- Checkout & Payment ---
r.post("/checkout",
  limiter,
  body("orderRef").isUUID().withMessage("Invalid orderRef"),
  body("customer.email").isEmail().withMessage("Valid email required"),
  body("customer.firstName").trim().notEmpty().withMessage("First name is required"),
  body("customer.phone").trim().notEmpty().withMessage("Phone is required"),
  validate,
  moveToCheckout
);

r.post("/payment/confirm",
  limiter,
  body("orderRef").isUUID().withMessage("Invalid orderRef"),
  body("paymentDetails.method").notEmpty().withMessage("Payment method required"),
  body("paymentDetails.id").notEmpty().withMessage("Payment ID required"),
  validate,
  markAsPaid
);

r.get("/order/status/:orderRef",
  limiter,
  param("orderRef").isUUID().withMessage("Invalid orderRef"),
  validate,
  getOrderStatus
);

r.get("/orders/my",
  limiter,
  query("email").isEmail().withMessage("Valid email required"),
  validate,
  getMyOrders
);

// --- Admin (protected by assertAdmin inside each controller via x-admin-token header) ---
r.get("/admin/orders/paid", adminLimiter, getPaidStoreOrders);
r.get("/admin/analytics", adminLimiter, getAnalytics);
r.post("/admin/cleanup-expired", adminLimiter, cleanupExpiredOrders);

r.post("/admin/upload-image",
  adminLimiter,
  upload.single("image"),
  handleImageUpload
);

r.get("/admin/orders", adminLimiter, getAllOrders);
r.patch("/admin/orders/:id/status", adminLimiter,
  param("id").isMongoId().withMessage("Invalid Order ID"),
  body("status").notEmpty().withMessage("Status is required"),
  validate,
  updateOrderStatus
);

export default r;