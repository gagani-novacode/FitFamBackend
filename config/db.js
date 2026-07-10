// config/db.js
import mongoose from "mongoose";

// This will cache the database connection.
// In a serverless environment, this object will persist
// across "warm" invocations.
let cachedDb = null;

export async function connectDB(uri) {
  if (!uri) throw new Error("MONGO_URI is not set");

  // **RECOMMENDED: Disable buffering**
  // This makes your app "fail fast" if you try to
  // use a model before the connection is open.
  mongoose.set("bufferCommands", false);

  // If we already have a connection, reuse it
  if (cachedDb) {
    // console.log("✅ Using cached MongoDB connection");
    return cachedDb;
  }

  // console.log("⌛ Creating new MongoDB connection...");
  mongoose.set("strictQuery", true);

  // Connect and cache the connection promise
  cachedDb = await mongoose.connect(uri, {
    dbName: "sarakuglobal",
    serverSelectionTimeoutMS: 120000, // Keep your longer timeout
    socketTimeoutMS: 120000,

    // **NEW (Optional but Recommended):**
    // Set the buffer timeout to match your connection timeout
    // if you absolutely must keep buffering on (not recommended).
    // bufferTimeoutMS: 60000, 
  });

  console.log("✅ New MongoDB connected");
  return cachedDb;
}