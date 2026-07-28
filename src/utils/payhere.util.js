// src/utils/payhere.util.js
import CryptoJS from "crypto-js";

/** Format to 2 decimals (as string) */
export function formatAmount2(amount) {
  return Number(amount).toFixed(2);
}

/** PayHere 'hash' used when starting a payment */
export function buildCheckoutHash({ merchantId, orderId, amountStr, currency, merchantSecret }) {
  const hashedSecret = CryptoJS.MD5(merchantSecret).toString().toUpperCase();
  const raw = merchantId + orderId + amountStr + currency + hashedSecret;
  const hash = CryptoJS.MD5(raw).toString().toUpperCase();

  console.log("PayHere Hash (crypto-js) Raw Prefix:", merchantId + orderId + amountStr + currency);
  return hash;
}

/** PayHere 'md5sig' used to verify notify callback */
export function buildMd5Sig({ merchantId, orderId, payhereAmount, payhereCurrency, statusCode, merchantSecret }) {
  const hashedSecret = CryptoJS.MD5(merchantSecret).toString().toUpperCase();
  const raw = merchantId + orderId + payhereAmount + payhereCurrency + statusCode + hashedSecret;
  return CryptoJS.MD5(raw).toString().toUpperCase();
}
