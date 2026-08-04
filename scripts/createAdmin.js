import { setServers } from "dns";
setServers(["8.8.8.8", "8.8.4.4"]);
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import path from "path";                          // ← add this
import { fileURLToPath } from "url";              // ← add this

// ← replace dotenvExpand.expand(dotenv.config()) with these 3 lines
const __dirname = fileURLToPath(new URL(".", import.meta.url));
dotenvExpand.expand(dotenv.config({ path: path.join(__dirname, "../.env") }));

import User from "../src/models/User.model.js";

await mongoose.connect(process.env.MONGO_URI);
console.log("✅ Connected to MongoDB");
console.log("📦 Database name:", mongoose.connection.name);

const email = "admin@fitfam.com";
const password = "Admin@123456";

const existing = await User.findOne({ email });
if (existing) {
    console.log("⚠️ Admin already exists:", existing.email, "| role:", existing.role);
} else {
    const hashed = await bcrypt.hash(password, 10);
    const admin = await User.create({
        firstName: "Admin",
        lastName: "FitFam",
        email,
        password: hashed,
        role: "admin",
    });
    console.log("✅ Admin created:", admin.email, "| role:", admin.role);
}

await mongoose.disconnect();
console.log("🔌 Disconnected");
process.exit(0);