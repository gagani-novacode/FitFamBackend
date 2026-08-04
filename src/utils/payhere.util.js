import CryptoJS from "crypto-js";

export function formatAmount2(amount) {
  const clean = String(amount).replace(/[^0-9.]/g, "");
  return parseFloat(clean).toFixed(2);
}

export function buildCheckoutHash({ merchantId, orderId, amountStr, currency, merchantSecret }) {
  // Step 1: Hash the merchant secret
  const hashedSecret = CryptoJS.MD5(merchantSecret.trim()).toString(CryptoJS.enc.Hex).toUpperCase();

  // Step 2: Concatenate and hash everything together
  const raw = merchantId.trim() + orderId.trim() + amountStr + currency.trim() + hashedSecret;
  const hash = CryptoJS.MD5(raw).toString(CryptoJS.enc.Hex).toUpperCase();

  console.log("=== PAYHERE HASH DEBUG ===");
  console.log("merchantId  :", JSON.stringify(merchantId.trim()));
  console.log("orderId     :", JSON.stringify(orderId.trim()));
  console.log("amountStr   :", JSON.stringify(amountStr));
  console.log("currency    :", JSON.stringify(currency.trim()));
  console.log("hashedSecret:", hashedSecret);
  console.log("raw         :", raw);
  console.log("final hash  :", hash);
  console.log("==========================");

  return hash;
}

export function buildMd5Sig({ merchantId, orderId, payhereAmount, payhereCurrency, statusCode, merchantSecret }) {
  // Step 1: Hash the merchant secret
  const hashedSecret = CryptoJS.MD5(merchantSecret.trim()).toString(CryptoJS.enc.Hex).toUpperCase();

  // Step 2: Concatenate and hash everything together
  const raw = merchantId.trim() + orderId.trim() + payhereAmount + payhereCurrency.trim() + statusCode + hashedSecret;
  const hash = CryptoJS.MD5(raw).toString(CryptoJS.enc.Hex).toUpperCase();

  return hash;
}