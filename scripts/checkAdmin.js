// scripts/checkAdmin.js
import { setServers } from "dns";
setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
dotenvExpand.expand(dotenv.config());

import User from "../src/models/User.model.js";

await mongoose.connect(process.env.MONGO_URI);

const user = await User.findOne({ email: "admin@fitfam.com" }).select("+password");
console.log("User found:", !!user);
console.log("Role:", user?.role);
console.log("Has password hash:", !!user?.password);

// Test password match
const match = await bcrypt.compare("Admin@123456", user?.password || "");
console.log("Password match:", match);

await mongoose.disconnect();
process.exit(0);