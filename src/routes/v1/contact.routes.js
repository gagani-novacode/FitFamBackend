import { Router } from "express";
import { submitContactForm } from "../../controllers/contact.controller.js";

const r = Router();

r.post("/", submitContactForm);

export default r;
