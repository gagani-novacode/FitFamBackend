import mongoose from "mongoose";

const CustomerQRSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    qrKey: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model("CustomerQR", CustomerQRSchema);
