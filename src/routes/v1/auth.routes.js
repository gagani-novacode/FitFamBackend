import { Router } from "express";
import { registerUser, loginUser, getMe } from "../../controllers/auth.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const r = Router();

r.post("/register", registerUser);
r.post("/login", loginUser);
r.get("/me", protect, getMe);

export default r;
