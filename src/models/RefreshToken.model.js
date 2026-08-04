import mongoose from "mongoose";

const RefreshTokenSchema = new mongoose.Schema(
  {
    // Store hashed version of the refresh token (never store plain text)
    token: { type: String, required: true, unique: true },

    // Which user this token belongs to
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // When this token expires — MongoDB TTL index auto-deletes expired documents
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index: MongoDB will automatically delete documents when expiresAt passes
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Note: token already has a unique index from the schema definition above

export default mongoose.model("RefreshToken", RefreshTokenSchema);
