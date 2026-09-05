import crypto from "crypto";
import qrcode from "qrcode";
import CustomerQR from "../models/CustomerQR.model.js";

/**
 * Process a customer's QR code.
 * If the customer (by email) already has a QR key, returns their existing QR code data URL.
 * Otherwise, generates a new QR key, saves it in the database, and returns the new QR code data URL.
 *
 * @param {Object} customer - The customer object containing email, firstName, lastName.
 * @returns {Promise<string>} - A promise that resolves to a base64 encoded PNG data URI of the QR code.
 */
export async function processCustomerQR(customer) {
  if (!customer || !customer.email) {
    throw new Error("Customer email is required to process QR code");
  }

  const email = customer.email.toLowerCase().trim();
  let customerQR = await CustomerQR.findOne({ email });

  if (!customerQR) {
    // Generate a new unique key
    const qrKey = crypto.randomBytes(8).toString("hex").toUpperCase();
    
    // Save to the database
    customerQR = await CustomerQR.create({
      email: email,
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      phone: customer.phone || "",
      qrKey: qrKey,
    });
  }

  // Generate Base64 Image string natively
  try {
    const qrDataURL = await qrcode.toDataURL(customerQR.qrKey, { width: 150, margin: 1 });
    return qrDataURL;
  } catch (err) {
    console.error("Error generating QR code:", err);
    throw err;
  }
}
