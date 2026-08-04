import { Router } from "express";
import reviewRoutes from "./review.routes.js";
import storeRoutes from "./store.routes.js";
import payhereRoutes from "./payhere.routes.js";
import kokoRoutes from "./koko.routes.js";
import authRoutes from "./auth.routes.js";
import contactRoutes from "./contact.routes.js";
import newsletterRoutes from "./newsletter.routes.js";
import adminRoutes from "./admin.routes.js";


const router = Router();

router.use("/", reviewRoutes);
router.use("/store", storeRoutes);
router.use("/payhere", payhereRoutes);
router.use("/koko", kokoRoutes);
router.use("/auth", authRoutes);
router.use("/contact", contactRoutes);
router.use("/newsletter", newsletterRoutes);
router.use("/admin", adminRoutes);


export default router;
