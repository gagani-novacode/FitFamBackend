import User from "../models/User.model.js";
import RefreshToken from "../models/RefreshToken.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Short-lived access token (default 15m, set JWT_EXPIRES_IN in .env) */
const generateAccessToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
};

/** Generate a cryptographically random refresh token string */
const generateRawRefreshToken = () => crypto.randomBytes(64).toString("hex");

/** Hash the raw token before storing in DB (never store plain text) */
const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

/** How many days the refresh token lives (default 7) */
const refreshTokenDays = () =>
  parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "7", 10);

/** Set the httpOnly refresh-token cookie on the response */
const setRefreshCookie = (res, rawToken) => {
  res.cookie("refreshToken", rawToken, {
    httpOnly: true,                        // JS cannot read this cookie
    secure: true, // HTTPS only in prod
    sameSite: "none",                    // CSRF protection
    maxAge: refreshTokenDays() * 24 * 60 * 60 * 1000,
  });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /auth/register
 * Public registration — role is always forced to "user"
 */
export const registerUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ ok: false, message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "user", // Always forced — cannot be overridden from request body
    });

    res.status(201).json({
      ok: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        token: generateAccessToken(user._id, user.role),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/login
 * Verifies credentials, returns a short-lived access token in the body
 * and stores a long-lived refresh token as an httpOnly cookie.
 */
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      // Same message for both cases — don't reveal which one failed
      return res.status(401).json({ ok: false, message: "Invalid email or password" });
    }

    // --- Issue access token ---
    const accessToken = generateAccessToken(user._id, user.role);

    // --- Issue refresh token ---
    const rawRefreshToken = generateRawRefreshToken();
    const hashedRefreshToken = hashToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTokenDays());

    // Remove any previous refresh tokens for this user (single-session policy)
    await RefreshToken.deleteMany({ userId: user._id });

    // Store the hashed refresh token in the database
    await RefreshToken.create({
      token: hashedRefreshToken,
      userId: user._id,
      expiresAt,
    });

    // Send raw refresh token as httpOnly cookie
    setRefreshCookie(res, rawRefreshToken);

    res.json({
      ok: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        token: accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/refresh
 * Reads the httpOnly cookie, validates the refresh token against the DB,
 * and returns a fresh access token. No Authorization header needed.
 */
export const refreshToken = async (req, res, next) => {
  try {
    const raw = req.cookies?.refreshToken;

    if (!raw) {
      return res.status(401).json({ ok: false, message: "No refresh token" });
    }

    const hashed = hashToken(raw);

    const stored = await RefreshToken.findOne({ token: hashed }).populate("userId");

    if (!stored) {
      return res.status(401).json({ ok: false, message: "Invalid or expired refresh token" });
    }

    // Guard: check expiry manually (TTL index handles cleanup but has a delay)
    if (stored.expiresAt < new Date()) {
      await stored.deleteOne();
      res.clearCookie("refreshToken");
      return res.status(401).json({ ok: false, message: "Refresh token expired" });
    }

    const user = stored.userId; // populated User document

    // Rotate: delete old token, issue a new one (prevents replay attacks)
    await stored.deleteOne();

    const newRaw = generateRawRefreshToken();
    const newHashed = hashToken(newRaw);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTokenDays());

    await RefreshToken.create({ token: newHashed, userId: user._id, expiresAt });
    setRefreshCookie(res, newRaw);

    const newAccessToken = generateAccessToken(user._id, user.role);

    res.json({ ok: true, token: newAccessToken });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/logout
 * Deletes the refresh token from the DB and clears the httpOnly cookie.
 */
export const logoutUser = async (req, res, next) => {
  try {
    const raw = req.cookies?.refreshToken;

    if (raw) {
      const hashed = hashToken(raw);
      await RefreshToken.deleteOne({ token: hashed });
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.json({ ok: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /auth/me
 * Returns the currently authenticated user's profile.
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ ok: false, message: "User not found" });
    }
    res.json({ ok: true, user });
  } catch (error) {
    next(error);
  }
};