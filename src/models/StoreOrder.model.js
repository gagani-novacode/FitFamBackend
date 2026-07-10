import mongoose from "mongoose";

const LogItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    size: { type: String, required: true }, // e.g., "S", "M", "L"
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const CustomerSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName:  { type: String, trim: true },
    email:     { type: String, trim: true, lowercase: true },
    phone:     { type: String, trim: true },
    address:   { type: String, trim: true },
    city:      { type: String, trim: true },
    country:   { type: String, trim: true },
    postalCode:{ type: String, trim: true },
  },
  { _id: false }
);

const StoreOrderSchema = new mongoose.Schema(
  {
    orderRef: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // For logged-in users
    customer: { type: CustomerSchema, default: {} },
    items:    { type: [LogItemSchema], default: [] },
    total:    { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, default: "LKR" },

    // Lifecycle statuses:
    // CART: Initial state (Draft)
    // CHECKOUT: Inventory reserved, awaiting payment
    // PAID: Successful payment
    // FAILED: Payment failed
    // EXPIRED: Reserved inventory released after timeout
    // CANCELLED: Manually cancelled
    status: { 
      type: String, 
      enum: ["CART", "CHECKOUT", "PAID", "FAILED", "CANCELLED", "EXPIRED"], 
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
