// src/utils/payhere.util.js
import crypto from "crypto";

/** Format to 2 decimals (as string) */
export function formatAmount2(amount) {
  return Number(amount).toFixed(2);
}

/** PayHere 'hash' used when starting a payment */
export function buildCheckoutHash({ merchantId, orderId, amountStr, currency, merchantSecret }) {
  const inner = crypto.createHash("md5").update(merchantSecret).digest("hex").toUpperCase();
  const raw = `${merchantId}${orderId}${amountStr}${currency}${inner}`;
  return crypto.createHash("md5").update(raw).digest("hex").toUpperCase();
}

/** PayHere 'md5sig' used to verify notify callback */
export function buildMd5Sig({ merchantId, orderId, payhereAmount, payhereCurrency, statusCode, merchantSecret }) {
  const inner = crypto.createHash("md5").update(merchantSecret).digest("hex").toUpperCase();
  const raw = `${merchantId}${orderId}${payhereAmount}${payhereCurrency}${statusCode}${inner}`;
  return crypto.createHash("md5").update(raw).digest("hex").toUpperCase();
}