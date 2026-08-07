import mongoose from "mongoose";
import crypto from "crypto";

// Generate readable order ref: SAR-YYYYMMDD-XXXX
function generateOrderRef() {
  const date = new Date();
  const dateStr = date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase(); // e.g. 4X9K
  return `FITFAM-${dateStr}-${suffix}`;
}

const LogItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    size: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const CustomerSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true },
    postalCode: { type: String, trim: true },
  },
  { _id: false }
);

const StoreOrderSchema = new mongoose.Schema(
  {
    orderRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: generateOrderRef, // ← auto-generated on creation
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customer: { type: CustomerSchema, default: {} },
    items: { type: [LogItemSchema], default: [] },
    total: { type: Number, required: true, min: 0, default: 0 },
    discountCode: { type: String, trim: true },
    discountPercentage: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    currency: { type: String, default: "LKR" },
    status: {
      type: String,
      enum: ["CART", "CHECKOUT", "PAID", "DISPATCHED", "COMPLETED", "FAILED", "CANCELLED", "EXPIRED"],
      default: "CART"
    },
    checkoutAt: { type: Date },
    paidAt: { type: Date },
    paymentMethod: { type: String },
    paymentId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("StoreOrder", StoreOrderSchema);
export { LogItemSchema };