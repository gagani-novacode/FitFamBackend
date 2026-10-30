import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../../config/db.js";
import { setServers } from "dns";

// Fix Windows / ISP DNS SRV lookup failure for mongodb+srv
setServers(["8.8.8.8", "8.8.4.4"]);

// Import all models
import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import StoreOrder from "../models/StoreOrder.model.js";
import Discount from "../models/Discount.model.js";
import Review from "../models/Review.model.js";
import Sale from "../models/Sale.model.js";
import Subscriber from "../models/Subscriber.model.js";
import RefreshToken from "../models/RefreshToken.model.js";
import CustomerQR from "../models/CustomerQR.model.js";

async function initializeCollections() {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB(process.env.MONGO_URI);

    const models = [
      { name: "users", model: User },
      { name: "products", model: Product },
      { name: "storeorders", model: StoreOrder },
      { name: "discounts", model: Discount },
      { name: "reviews", model: Review },
      { name: "sales", model: Sale },
      { name: "subscribers", model: Subscriber },
      { name: "refreshtokens", model: RefreshToken },
      { name: "customerqrs", model: CustomerQR }
    ];

    console.log("Initializing collections and indexes...");
    for (const { name, model } of models) {
      await model.init(); // Builds indexes
      await model.createCollection(); // Ensures collection exists
      console.log(`  ✓ Collection "${name}" ready`);
    }

    console.log("\n✅ All collections created in 'fitfamstore' successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Initialization error:", error);
    process.exit(1);
  }
}

initializeCollections();
