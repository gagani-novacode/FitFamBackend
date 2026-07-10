// src/routes/v1/koko.routes.js
import { Router } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import {
  prepareKokoCheckout,
  handleKokoResponse,
  orderView,
} from "../../controllers/koko.controller.js";

const r = Router();
const limiter = rateLimit({ windowMs: 30 * 1000, max: 60 });

// Frontend requests server to prepare the signed KOKO payload for a given orderRef
r.post("/store/checkout", limiter, prepareKokoCheckout);

// KOKO server will POST results here (must match KOKO_RESPONSE_URL in env).

r.post("/response", express.urlencoded({ extended: false }), handleKokoResponse);

// Optional: server-side order view
r.post("/order-view", limiter, orderView);

export default r;
