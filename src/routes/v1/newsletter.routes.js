import { Router } from "express";
import { subscribeNewsletter } from "../../controllers/newsletter.controller.js";

const r = Router();

r.post("/subscribe", subscribeNewsletter);

export default r;
