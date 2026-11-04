import mongoose from "mongoose";

const SubcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, trim: true, default: "" },
    clothingTypes: { type: [String], default: ["Tops", "Bottoms"] },
    subcategories: { type: [SubcategorySchema], default: [] },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Category", CategorySchema);
