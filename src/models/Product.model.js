import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ["Men", "Women", "Accessories"], required: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    description: { type: String, trim: true },
    images: { type: [String], default: [] }, // Array of URLs
    sizes: { type: [String], default: [] }, // e.g., ["S", "M", "L"]
    
    // Inventory mapped by size, e.g., { "S": 10, "M": 5 }
    stock: { type: Map, of: Number, default: {} },
    
    isNewProduct: { type: Boolean, default: false },
    isSale: { type: Boolean, default: false },
    badge: { type: String, trim: true }, // e.g., "HOT", "NEW"
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Product", ProductSchema);
