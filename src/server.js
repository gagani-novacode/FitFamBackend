import "dotenv/config.js";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { connectDB } from "../config/db.js";
import v1Routes from "./routes/v1/index.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";

import crypto from "crypto";
import logger from "./utils/logger.js";

const app = express();

import { setServers } from 'dns';
setServers(['8.8.8.8', '8.8.4.4']);

/* 0) Request ID Middleware */
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  next();
});

/* 1) Trust proxy (API Gateway sets X-Forwarded-*). 1 is fine. */
app.set("trust proxy", 1);

/* 2) Security */
app.use(helmet());

/* 3) CORS */
app.use(
  cors({
    origin: true,
    credentials: false,
  })
);

/* 4) Body parsers */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

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
app.get("/", (req, res) =>
  res.json({ ok: true, name: "Saraku API" })
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
