import "dotenv/config";
import mongoose from "mongoose";
import nodemailer from "nodemailer";

console.log("=== FITFAM Offer Email Debug Test ===\n");
console.log("MONGO_URI present:", !!(process.env.MONGO_URI || process.env.DATABASE_URL));
console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("SMTP_PORT:", process.env.SMTP_PORT);
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("FROM_EMAIL:", process.env.FROM_EMAIL);
console.log("FRONTEND_URL:", process.env.FRONTEND_URL);
console.log("");

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
if (!MONGO_URI) {
  console.error("ERROR: No MONGO_URI / DATABASE_URL found in .env");
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log("MongoDB connected OK\n");

const SubscriberSchema = new mongoose.Schema({ email: String }, { collection: "subscribers" });
const Subscriber = mongoose.models.Subscriber || mongoose.model("Subscriber", SubscriberSchema);

const subs = await Subscriber.find({}, "email").lean();
console.log("Subscribers in DB:", subs.length);
subs.forEach((s, i) => console.log("  [" + (i+1) + "] " + s.email));
console.log("");

if (!subs.length) {
  console.log("No subscribers found. Make sure someone has subscribed on the frontend first.");
  await mongoose.disconnect();
  process.exit(0);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

console.log("Verifying SMTP connection...");
try {
  await transporter.verify();
  console.log("SMTP connection: OK\n");
} catch (err) {
  console.error("SMTP FAILED:", err.message);
  await mongoose.disconnect();
  process.exit(1);
}

const testEmail = subs[0].email;
console.log("Sending test offer email to:", testEmail);

try {
  const info = await transporter.sendMail({
    from: process.env.FROM_EMAIL || "FitFam Active <gagzhas2002wg@gmail.com>",
    to: testEmail,
    subject: "TEST: FITFAM Offer Notification System",
    html: "<div style='font-family: sans-serif; padding: 30px;'><h1 style='color:#111;'>FITFAM</h1><h2>Offer email system is working!</h2><p>If you received this, subscriber offer notifications are correctly configured.</p></div>",
  });
  console.log("SUCCESS! Email sent.");
  console.log("  messageId:", info.messageId);
  console.log("  response:", info.response);
} catch (err) {
  console.error("FAILED to send email:", err.message);
}

await mongoose.disconnect();
console.log("\nDone.");
