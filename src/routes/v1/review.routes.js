import { Router } from "express";
import rateLimit from "express-rate-limit";
import { body } from "express-validator";
import { createReview, listReviews } from "../../controllers/review.controller.js";

const router = Router();

// Rate limit to prevent spam
const reviewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});

// POST /api/v1/reviews/add
router.post(
  "/reviews/add",
  reviewLimiter,
  body("product").trim().isLength({ min: 1 }).withMessage("Product is required"),
  body("name").trim().isLength({ min: 2, max: 100 }),
  body("email").isEmail(),
  body("review").trim().isLength({ min: 2, max: 2000 }),
  body("stars").isInt({ min: 1, max: 5 }),
  createReview
);

// POST /api/v1/reviews/list
router.post(
  "/reviews/list",
  body("product").trim().isLength({ min: 1 }).withMessage("Product is required"),
  body("limit").optional().isInt({ min: 1, max: 100 }),
  listReviews
);

export default router;
