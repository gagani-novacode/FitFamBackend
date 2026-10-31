import crypto from "crypto";
import qrcode from "qrcode";
import CustomerQR from "../models/CustomerQR.model.js";

/**
 * Get an existing CustomerQR or create a new one for this email.
 * Updates firstName, lastName, phone if provided.
 *
 * @param {Object} customer - The customer object containing email, firstName, lastName, phone.
 * @returns {Promise<{ customerQR: Object, qrDataURL: string }>}
 */
export async function getOrCreateCustomerQR(customer) {
  if (!customer || !customer.email) {
    throw new Error("Customer email is required to process QR code");
  }

  const email = customer.email.toLowerCase().trim();
  let customerQR = await CustomerQR.findOne({ email });

  if (!customerQR) {
    const qrKey = crypto.randomBytes(8).toString("hex").toUpperCase();
    customerQR = await CustomerQR.create({
      email,
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      phone: customer.phone || "",
      qrKey,
    });
  } else {
    // Optionally keep latest phone/name in sync if previously empty
    let updated = false;
    if (!customerQR.phone && customer.phone) {
      customerQR.phone = customer.phone;
      updated = true;
    }
    if (!customerQR.firstName && customer.firstName) {
      customerQR.firstName = customer.firstName;
      updated = true;
    }
    if (!customerQR.lastName && customer.lastName) {
      customerQR.lastName = customer.lastName;
      updated = true;
    }
    if (updated) {
      await customerQR.save();
    }
  }

  const qrDataURL = await qrcode.toDataURL(customerQR.qrKey, { width: 150, margin: 1 });
  return { customerQR, qrDataURL };
}

/**
 * Returns just the QR data URL for backward compatibility.
 */
export async function processCustomerQR(customer) {
  const { qrDataURL } = await getOrCreateCustomerQR(customer);
  return qrDataURL;
}
