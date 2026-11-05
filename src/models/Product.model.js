import mongoose from "mongoose";

// ---- Color Variation Sub-Schema --------------------------------
const ColorVariationSchema = new mongoose.Schema(
  {
    colorName:  { type: String, required: true, trim: true },   // e.g. "Black"
    colorHex:   { type: String, trim: true, default: "" },      // e.g. "#1a1a1a"
    sku:        { type: String, trim: true, default: "" },      // e.g. "TSHIRT-BLK"
    images:     { type: [String], default: [] },                // per-color Cloudinary URLs
    sizes:      { type: [String], default: [] },                // available sizes for this color
    stock:      { type: Map, of: Number, default: {} },         // { S: 5, M: 12, L: 8 }
    price:      { type: Number, min: 0 },                       // override price (optional)
    isAvailable:{ type: Boolean, default: true },
  },
  { _id: true }
);

// ---- Product Schema --------------------------------------------
const ProductSchema = new mongoose.Schema(
  {
    name:               { type: String, required: true, trim: true },
    category:           { type: String, required: true, trim: true },
    subCategory:        { type: String, trim: true, default: "" },
    clothingType:       { type: String, trim: true, default: "Tops" },

    // --- Base pricing (used when no variation or variation has no price override)
    price:              { type: Number, required: true, min: 0 },
    originalPrice:      { type: Number, min: 0 },

    // --- Descriptions
    description:        { type: String, trim: true },
    descriptionAbout:   { type: String, trim: true },
    descriptionFeatures:{ type: String, trim: true },
    descriptionCare:    { type: String, trim: true },

    // --- Fallback (single-variation mode) images / sizes / stock
    images:    { type: [String], default: [] },
    sizes:     { type: [String], default: [] },
    stock:     { type: Map, of: Number, default: {} },

    // --- Color Variations (Phase 3)
    hasVariations: { type: Boolean, default: false },
    variations: { type: [ColorVariationSchema], default: [] },

    // --- Flags
    isNewProduct: { type: Boolean, default: false },
    isSale:       { type: Boolean, default: false },
    badge:        { type: String, trim: true },
    tags:         { type: [String], default: [] },

    // --- Size Guide (Phase 2)
    sizeGuide: { type: mongoose.Schema.Types.ObjectId, ref: "SizeGuide", default: null },
    customSizeGuide: {
      enabled:          { type: Boolean, default: false },
      columns:          { type: [String], default: [] },
      rows:             { type: [mongoose.Schema.Types.Mixed], default: [] },
      unit:             { type: String, default: "in" },
      measurementNotes: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Product", ProductSchema);
