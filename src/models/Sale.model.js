import mongoose from "mongoose";

const SaleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    // Map of productId (string) -> flat discount amount in LKR
    products: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

// Virtual: is this sale currently running?
SaleSchema.virtual("isRunning").get(function () {
  const now = new Date();
  return this.isActive && this.startDate <= now && this.endDate >= now;
});

SaleSchema.set("toJSON", { virtuals: true });
SaleSchema.set("toObject", { virtuals: true });

export default mongoose.model("Sale", SaleSchema);
