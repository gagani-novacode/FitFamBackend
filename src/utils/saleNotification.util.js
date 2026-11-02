import nodemailer from "nodemailer";
import Subscriber from "../models/Subscriber.model.js";
import logger from "./logger.js";

let _transporter = null;
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

/**
 * Sends a notification email to all active newsletter subscribers about a sale or offer.
 * @param {Object} offerDetails
 * @param {string} offerDetails.saleName - Title of the sale/offer
 * @param {Array} offerDetails.products - Array of { _id, name, image, originalPrice, salePrice, discountAmount, url }
 */
export async function notifySubscribersAboutOffer({ saleName, products = [] }) {
  try {
    const subscribers = await Subscriber.find({}, "email").lean();
    if (!subscribers || subscribers.length === 0) {
      logger.info("[OfferNotification] No subscribers found, skipping email notification.");
      return;
    }

    const emailList = subscribers.map((s) => s.email).filter(Boolean);
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");

    logger.info("[OfferNotification] Preparing offer email for subscribers", {
      subscriberCount: emailList.length,
      saleName,
      productCount: products.length,
    });

    const productCardsHtml = products
      .slice(0, 8)
      .map((p) => {
        const productUrl = p.url || (p._id ? `${frontendUrl}/product/${p._id}` : `${frontendUrl}/shop`);
        return `
        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 20px; overflow: hidden; max-width: 520px; margin-left: auto; margin-right: auto;">
          ${
            p.image
              ? `<div style="width: 100%; height: 280px; overflow: hidden; background-color: #f9fafb;">
                   <img src="${p.image}" alt="${p.name}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
                 </div>`
              : ""
          }
          <div style="padding: 20px; text-align: left;">
            <div style="font-size: 10px; font-weight: 700; color: #dc2626; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;">Exclusive Offer</div>
            <h3 style="font-size: 18px; font-weight: 800; color: #111111; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">${p.name}</h3>
            
            <div style="margin-bottom: 16px; display: flex; align-items: baseline;">
              ${
                p.originalPrice && p.originalPrice > p.salePrice
                  ? `<span style="font-size: 14px; color: #9ca3af; text-decoration: line-through; margin-right: 10px;">රු ${Number(p.originalPrice).toLocaleString()}</span>`
                  : ""
              }
              <span style="font-size: 22px; font-weight: 800; color: #111111;">රු ${Number(p.salePrice).toLocaleString()}</span>
              ${
                p.discountAmount
                  ? `<span style="background-color: #fee2e2; color: #dc2626; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; margin-left: 10px;">SAVE රු ${Number(p.discountAmount).toLocaleString()}</span>`
                  : ""
              }
            </div>

            <a href="${productUrl}" style="display: block; text-align: center; background-color: #111111; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; padding: 13px 24px; border-radius: 2px;">
              Shop Now &rarr;
            </a>
          </div>
        </div>
      `;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Offer at FITFAM</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 30px 10px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #111111; padding: 36px 20px;">
              <h1 style="color: #ffffff; font-size: 30px; font-weight: 900; letter-spacing: 5px; margin: 0; text-transform: uppercase;">FITFAM</h1>
              <p style="color: #9ca3af; font-size: 10px; font-weight: 700; letter-spacing: 3px; margin: 6px 0 0 0; text-transform: uppercase;">Member VIP Notification</p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding: 30px 24px 15px 24px; text-align: center;">
              <span style="background-color: #ef4444; color: #ffffff; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 5px 14px; border-radius: 20px;">Special Deal Alert</span>
              <h2 style="font-size: 24px; font-weight: 800; color: #111111; margin: 16px 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">${saleName || "New Exclusive Offer"}</h2>
              <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 auto; max-width: 460px;">
                Great news! We just dropped exclusive discounts on our premium collection. As a FITFAM subscriber, you get first access.
              </p>
            </td>
          </tr>

          <!-- Products -->
          <tr>
            <td style="padding: 10px 20px 25px 20px;">
              ${productCardsHtml}
            </td>
          </tr>

          <!-- Browse All CTA -->
          <tr>
            <td align="center" style="padding: 0 24px 35px 24px;">
              <a href="${frontendUrl}/shop" style="display: inline-block; background-color: transparent; color: #111111; border: 2px solid #111111; text-decoration: none; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 12px 30px; border-radius: 2px;">
                View Entire Collection &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; border-top: 1px solid #f3f4f6; padding: 25px; text-align: center;">
              <p style="font-size: 12px; font-weight: 700; color: #111111; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1px;">FITFAM ACTIVE</p>
              <p style="font-size: 11px; color: #9ca3af; margin: 0 0 12px 0;">Engineered for endurance and everyday lifestyle.</p>
              <p style="font-size: 10px; color: #9ca3af; margin: 0;">
                You are receiving this email because you subscribed to the FITFAM newsletter at fitfam.lk.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const fromAddress = process.env.FROM_EMAIL || "FitFam Active <gagzhas2002wg@gmail.com>";
    const subject = `🔥 New Offer: ${saleName || "Special Discounts Available Now!"}`;

    // Send in batches of 50 using BCC so subscribers cannot see other email addresses
    const BATCH_SIZE = 50;
    for (let i = 0; i < emailList.length; i += BATCH_SIZE) {
      const bccBatch = emailList.slice(i, i + BATCH_SIZE);
      await getTransporter().sendMail({
        from: fromAddress,
        to: fromAddress,
        bcc: bccBatch,
        subject,
        html,
      });
    }

    logger.info("[OfferNotification] Successfully dispatched offer email to subscribers", {
      count: emailList.length,
    });
  } catch (error) {
    logger.error("[OfferNotification] Error dispatching offer email:", { error: error.message });
  }
}
