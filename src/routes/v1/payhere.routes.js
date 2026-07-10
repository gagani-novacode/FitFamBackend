// src/routes/v1/payhere.routes.js
import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  payhereBuildCheckoutForStore,
  payhereNotifyForStore,
} from "../../controllers/payhere.controller.js";

const r = Router();
const limiter = rateLimit({ windowMs: 30 * 1000, max: 60 });

// Client asks backend to build the PayHere payload for a given orderRef
r.post("/store/checkout", limiter, payhereBuildCheckoutForStore);

// PayHere server-to-server callback (must be publicly reachable)
r.post("/notify", payhereNotifyForStore);

export default r;
