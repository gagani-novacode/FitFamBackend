import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    name: { type: String, required: true, maxlength: 100, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      lowercase: true,
      index: true
    },
    review: { type: String, required: true, maxlength: 2000, trim: true },
    stars: { type: Number, required: true, min: 1, max: 5 }
  },
  { timestamps: true }
);

reviewSchema.index({ createdAt: -1 });

export default mongoose.model("Review", reviewSchema);
