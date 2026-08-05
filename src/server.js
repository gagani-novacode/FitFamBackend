import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
dotenvExpand.expand(dotenv.config());
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { connectDB } from "../config/db.js";
import v1Routes from "./routes/v1/index.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from "crypto";
import logger from "./utils/logger.js";

import { setServers } from 'dns';
setServers(['8.8.8.8', '8.8.4.4']);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express(); // ← app is now initialized first

/* Static files */
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, './uploads')));

/* 0) Request ID Middleware */
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  next();
});

/* 1) Trust proxy (API Gateway sets X-Forwarded-*). 1 is fine. */
app.set("trust proxy", 1);

/* 2) Security */
// REPLACE your current helmet config with this
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://*.trycloudflare.com", "https://sandbox.payhere.lk", "https://qaapi.paykoko.com",],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://*.unsplash.com", "http://localhost:8080", "https://*.trycloudflare.com"],
      formAction: ["'self'", "https://sandbox.payhere.lk", "https://www.payhere.lk", "https://qaapi.paykoko.com",],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://qaapi.paykoko.com",],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
    },
  },
}));

/* 3) CORS */
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
      ];

      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/.*\.trycloudflare\.com$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  })
);

/* 4) Body parsers */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

/* 4.5) Cookie parser — needed to read httpOnly refresh token cookies */
app.use(cookieParser());

/* 5) Access logs (Morgan + Winston) */
app.use(
  morgan((tokens, req, res) => {
    const status = tokens.status(req, res);
    const method = tokens.method(req, res);
    const url = tokens.url(req, res);
    const responseTime = tokens["response-time"](req, res);

    const message = `${method} ${url} ${status} - ${responseTime}ms`;

    if (status >= 500) {
      logger.error(message, { requestId: req.requestId });
    } else if (status >= 400) {
      logger.warn(message, { requestId: req.requestId });
    } else {
      logger.info(message, { requestId: req.requestId });
    }
    return null; // Suppress default morgan output
  }, {
    skip: (req) => req.path === "/health" || req.path === "/",
  })
);

/* 6) Rate limit (note: per-Lambda-instance, not global) */
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120, // limit each IP to 120 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* 7) Health checks */
app.get("/api", (req, res) =>
  res.json({ ok: true, name: "FitFam API" })
);

app.get("/health", (req, res) =>
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
    version: process.env.APP_VERSION || "dev",
  })
);

/* 8) API routes */
app.use("/api/v1", v1Routes);

/* 8.5) Serve Vite frontend */
app.use(express.static(path.join(__dirname, '../../FitFam/dist')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../../FitFam/dist', 'index.html'));
});

/* 9) Errors */
app.use(notFound);
app.use(errorHandler);

/* 10) Startup / Export */
const PORT = process.env.PORT || 8080;

// Connect DB
await connectDB(process.env.MONGO_URI);

if (!process.env.PAYHERE_SHOP_MERCHANT_ID) {
  console.warn("⚠️ PAYHERE_SHOP_MERCHANT_ID not set");
}

if (!process.env.PAYHERE_NOTIFY_URL) {
  console.warn("⚠️ PAYHERE_NOTIFY_URL not set (needed for payment callbacks)");
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;