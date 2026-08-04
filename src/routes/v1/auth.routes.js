import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  getMe,
} from "../../controllers/auth.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const r = Router();

/**
 * Brute-force protection on login:
 * Max 10 attempts per IP per 15 minutes.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Too many login attempts. Please try again in 15 minutes." },
});

// --- Public routes ---
r.post("/register", registerUser);
r.post("/login", loginLimiter, loginUser);

// --- Token management (uses httpOnly cookie — no Bearer token needed) ---
r.post("/refresh", refreshToken);
r.post("/logout", logoutUser);

// --- Protected route ---
r.get("/me", protect, getMe);

export default r;
