// src/seed.js
import "dotenv/config.js";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Product from "./models/Product.model.js";

const products = [
  {
    productCode: "SOAP_COFFEE_LEMON",
    name: "Saraku Coffee Lemon",
    description: "Saraku Coffee Lemon improves soil potassium levels and enhances crop yield performance.",
    weight: "0.13KG / 1.3 KG",
    shelfLife: "Shelf life – 2 years",
    price: 3200,
    image: "/products/soap.webp",
    availableItems: 100,
    initialItems: 100,
    tags: ["Coffee", "Lemon", "Premium"]
  },
  {
    productCode: "SOAP_ALOE_VERA",
    name: "Saraku Aloe Vera",
    description: "Our Aloe Vera soap is handcrafted with pure aloe extracts to provide a gentle, hydrating cleanse.",
    weight: "0.13KG / 1.3 KG",
    shelfLife: "Shelf life – 2 years",
    price: 3200,
    image: "/products/alowerasoap.png",
    availableItems: 100,
    initialItems: 100,
    tags: ["Aloe Vera", "Soothing", "Sensitive Skin"]
  },
  {
    productCode: "SOAP_MINT",
    name: "Saraku Mint",
    description: "Infused with natural mint oils, this soap provides a cooling sensation and a refreshing aroma.",
    weight: "0.13KG / 1.3 KG",
    shelfLife: "Shelf life – 2 years",
    price: 3200,
    image: "/products/mintsoap.png",
    availableItems: 100,
    initialItems: 100,
    tags: ["Mint", "Invigorating", "Cooling"]
  },
  {
    productCode: "SOAP_BALLS",
    name: "Saraku Soap Balls",
    description: "Artisan soap balls carefully crafted to provide a unique and luxurious bathing experience.",
    weight: "0.13KG / 1.3 KG",
    shelfLife: "Shelf life – 2 years",
    price: 3500,
    image: "/products/soapballs.png",
    availableItems: 100,
    initialItems: 100,
    tags: ["Artisan", "Luxury", "Multi-scent"]
  }
];

async function seed() {
  try {
    await connectDB(process.env.MONGO_URI);
    console.log("Cleaning existing products...");
    await Product.deleteMany({});
    
    console.log("Seeding products...");
    await Product.insertMany(products);
    
    console.log("✅ Database seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
