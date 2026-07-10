import { validationResult } from "express-validator";
import Review from "../models/Review.model.js";
import logger from "../utils/logger.js";

// Create a new review
export async function createReview(req, res, next) {
  const { product, name, email, review, stars } = req.body;
  logger.info("createReview: START", { productId: product, reviewer: name });
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("createReview: Validation failed", { errors: errors.array() });
      return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const saved = await Review.create({ product, name, email, review, stars });
    logger.info("createReview: SUCCESS", { reviewId: saved._id });

    res.status(201).json({ ok: true, review: saved });
  } catch (err) {
    logger.error("createReview: FAILED", { error: err.message });
    next(err);
  }
}

// List reviews for a product
export async function listReviews(req, res, next) {
  const { product, limit = 50 } = req.body;
  logger.info("listReviews: START", { productId: product, limit });
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("listReviews: Validation failed", { errors: errors.array() });
      return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const reviews = await Review.find({ product })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100));
    
    logger.info("listReviews: SUCCESS", { productId: product, count: reviews.length });
    res.json(reviews);
  } catch (err) {
    logger.error("listReviews: FAILED", { productId: product, error: err.message });
    next(err);
  }
}
