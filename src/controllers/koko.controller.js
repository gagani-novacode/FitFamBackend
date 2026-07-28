// controllers/koko.controller.js
import Product from "../models/Product.model.js";
import StoreOrder from "../models/StoreOrder.model.js";
import { signWithPrivateKey, verifyWithPublicKey } from "../utils/rsa.util.js";
import { kokoOrderView } from "../utils/koko.client.js";
import { markAsPaid } from "./store.controller.js";
import logger from "../utils/logger.js";

// Helper for KOKO data string
function buildOrderCreateDataString(params) {
  const keys = [
    "_mId",
    "api_key",
    "_returnUrl",
    "_cancelUrl",
    "_responseUrl",
    "_amount",
    "_currency",
    "_reference",
    "_orderId",
    "_pluginName",
    "_pluginVersion",
    "_description",
    "_firstName",
    "_lastName",
    "_email",
  ];
  return keys.map((k) => params[k] || "").join("");
}

export const prepareKokoCheckout = async (req, res) => {
  const { orderRef } = req.body;
  logger.info("prepareKokoCheckout: START", { orderRef });
  try {
    if (!orderRef) {
      logger.warn("prepareKokoCheckout: orderRef missing");
      return res.status(400).json({ ok: false, error: "orderRef required" });
    }

    const order = await StoreOrder.findOne({ orderRef }).lean();
    if (!order) {
      logger.warn("prepareKokoCheckout: Order not found", { orderRef });
      return res.status(404).json({ ok: false, error: "Order not found" });
    }

    // ── Check if Koko credentials are configured ──────────────────────
    const hasCredentials =
      process.env.KOKO_MERCHANT_ID &&
      process.env.KOKO_API_KEY &&
      process.env.KOKO_PRIVATE_KEY;

    // ── If no credentials — return mock payload for dev/testing ───────
    if (!hasCredentials) {
      logger.warn("prepareKokoCheckout: No Koko credentials — returning mock payload");
      return res.json({
        ok: true,
        mock: true,  // ← flag so frontend knows this is a mock
        payment: {
          _mId: "MOCK_MERCHANT",
          _amount: (order.total || 0).toFixed(2),
          _currency: order.currency || "LKR",
          _orderId: order.orderRef,
          _reference: order.orderRef,
          _firstName: order.customer?.firstName || "",
          _lastName: order.customer?.lastName || "",
          _email: order.customer?.email || "",
        }
      });
    }

    const amount = (order.total || 0).toFixed(2);
    const currency = order.currency || "LKR";
    const orderId = String(order.orderRef);
    const reference = String(order.orderRef);

    const customer = order.customer || {};
    const firstName = customer.firstName || "";
    const lastName = customer.lastName || "";
    const email = customer.email || "";

    const description = (order.items || []).map((it) => `${it.qty}x item`).join(", ") || "order";

    const bodyParams = {
      _mId: process.env.KOKO_MERCHANT_ID,
      api_key: process.env.KOKO_API_KEY,
      _returnUrl: process.env.KOKO_RETURN_SHOP_URL,
      _cancelUrl: process.env.KOKO_CANCEL_URL,
      _responseUrl: process.env.KOKO_RESPONSE_URL,
      _amount: amount,
      _currency: currency,
      _reference: reference,
      _orderId: orderId,
      _pluginName: process.env.KOKO_PLUGIN_NAME || "customapi",
      _pluginVersion: process.env.KOKO_PLUGIN_VERSION || "1.0.0",
      _description: description,
      _firstName: firstName,
      _lastName: lastName,
      _email: email,
    };

    const dataString = buildOrderCreateDataString(bodyParams);
    const signature = signWithPrivateKey(process.env.KOKO_PRIVATE_KEY, dataString);

    logger.info("prepareKokoCheckout: SUCCESS", { orderRef });
    res.json({ ok: true, payment: { ...bodyParams, dataString, signature } });
  } catch (e) {
    logger.error("prepareKokoCheckout: FAILED", { orderRef, error: e.message });
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
};

export const handleKokoResponse = async (req, res) => {
  const { orderId, trnId, status, desc, signature } = req.body ?? {};
  logger.info("handleKokoResponse: START", { orderId, trnId, status });
  try {
    if (!orderId || !trnId || !status || !signature) {
      logger.warn("handleKokoResponse: missing fields", { orderId, trnId, status });
      return res.status(200).send("BAD");
    }

    const dataString = `${orderId}${trnId}${status}`;

    let verified = false;
    try {
      verified = verifyWithPublicKey(process.env.KOKO_PUBLIC_KEY, dataString, signature);
    } catch (sigErr) {
      logger.error("handleKokoResponse: signature verification exception", { orderId, error: sigErr.message });
      verified = false;
    }

    if (!verified) {
      logger.warn("handleKokoResponse: signature verification failed", { orderId });
      return res.status(200).send("INVALID_SIGNATURE");
    }

    const order = await StoreOrder.findOne({ orderRef: orderId });
    if (!order) {
      logger.warn("handleKokoResponse: unknown orderRef", { orderId });
      return res.status(200).send("ORDER_NOT_FOUND");
    }

    if (String(status).toUpperCase() === "SUCCESS") {
      logger.info("handleKokoResponse: SUCCESS - marking as paid", { orderId, trnId });
      order.status = "PAID";
      order.paidAt = new Date();
      order.paymentMethod = "KOKO";
      order.paymentId = trnId;
      await order.save();
      logger.info("handleKokoResponse: Order finalized", { orderId });
    } else {
      logger.warn("handleKokoResponse: Non-success status", { orderId, status });
      if (order.status === "CHECKOUT") {
        order.status = "FAILED";
        await order.save();
        logger.info("handleKokoResponse: Order marked as FAILED", { orderId });
      }
    }

    return res.status(200).send("OK");
  } catch (e) {
    logger.error("handleKokoResponse: CRITICAL FAILED", { error: e.message });
    return res.status(200).send("ERR");
  }
};

export const orderView = async (req, res) => {
  const { orderId } = req.body;
  logger.info("orderView: START", { orderId });
  try {
    if (!orderId) {
      logger.warn("orderView: orderId missing");
      return res.status(400).json({ ok: false, error: "orderId required" });
    }
    const kokoRes = await kokoOrderView(orderId);
    logger.info("orderView: SUCCESS", { orderId });
    res.json({ ok: true, result: kokoRes });
  } catch (e) {
    logger.error("orderView: FAILED", { orderId, error: e.message });
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
};
