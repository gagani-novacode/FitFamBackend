// utils/rsa.util.js
import crypto from "crypto";

/**
 * Normalize PEM by ensuring proper line breaks.
 * Accepts a PEM string possibly with literal \n sequences.
 */
function normalizePem(pem) {
  if (!pem) return pem;
  // If PEM contains literal "\n" sequences (stored in env), convert them
  if (pem.includes("\\n")) {
    return pem.replace(/\\n/g, "\n");
  }
  return pem;
}

/**
 * Sign a UTF-8 string using RSA-SHA256 and return base64 signature.
 * privateKey: PEM string
 */
export function signWithPrivateKey(privateKey, data) {
  const pem = normalizePem(privateKey);
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(data, "utf8");
  signer.end();
  const signature = signer.sign(pem, "base64");
  return signature;
}

/**
 * Verify a base64 signature using RSA-SHA256 and a public key (PEM).
 * Returns boolean.
 */
export function verifyWithPublicKey(publicKey, data, signatureBase64) {
  const pem = normalizePem(publicKey);
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(data, "utf8");
  verifier.end();
  try {
    return verifier.verify(pem, signatureBase64, "base64");
  } catch (e) {
    console.warn("verifyWithPublicKey error", e);
    return false;
  }
}
