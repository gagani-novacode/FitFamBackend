import mongoose from "mongoose";

const SizeGuideSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "" }, // e.g. "Men", "Women", "Accessories", or empty for universal
    clothingType: { type: String, trim: true, default: "" }, // e.g. "Tops", "Bottoms"
    columns: {
      type: [String],
      default: ["Size", "Chest (in)", "Length (in)"],
    },
    rows: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    unit: {
      type: String,
      enum: ["in", "cm", "both"],
      default: "in",
    },
    measurementNotes: {
      type: String,
      trim: true,
      default: "Measurements are in inches. Standard athletic fit.",
    },
    measureGuideImage: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SizeGuide", SizeGuideSchema);
