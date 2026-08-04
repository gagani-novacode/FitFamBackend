import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { body, query, param } from "express-validator";
import {
  listProducts,
  getProductById,
  getCart,
  addToCart,
  removeFromCart,
  updateCartQty,
  moveToCheckout,
  markAsPaid,
  getOrderStatus,
  getMyOrders,
} from "../../controllers/store.controller.js";
import { validationResult } from "express-validator";

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const r = Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }
  next();
};

const limiter = rateLimit({ windowMs: 30 * 1000, max: 60 });

// --- Products (public) ---
r.get("/products", listProducts);

r.get("/products/:id",
  param("id").isMongoId().withMessage("Invalid Product ID"),
  validate,
  getProductById
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

export default r;