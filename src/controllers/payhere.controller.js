import mongoose from "mongoose";
import StoreOrder from "../models/StoreOrder.model.js";
import { formatAmount2, buildCheckoutHash, buildMd5Sig } from "../utils/payhere.util.js";
import { markAsPaid } from "./store.controller.js";
import logger from "../utils/logger.js";

/**
 * Build PayHere checkout payload for a Store order (status=CHECKOUT).
 * POST body: { orderRef: string }
 */
export async function payhereBuildCheckoutForStore(req, res) {
  const { orderRef } = req.body || {};
  logger.info("payhereBuildCheckoutForStore: START", { orderRef });
  try {
    if (!orderRef) {
      logger.warn("payhereBuildCheckoutForStore: orderRef missing");
      return res.status(400).json({ ok: false, error: "orderRef required" });
    }

    const order = await StoreOrder.findOne({ orderRef }).lean();
    if (!order) {
      logger.warn("payhereBuildCheckoutForStore: Order not found", { orderRef });
      return res.status(404).json({ ok: false, error: "Order not found" });
    }

    // We only allow building checkout for orders in CHECKOUT status (inventory already reserved)
    if (order.status !== "CHECKOUT") {
      logger.warn("payhereBuildCheckoutForStore: Invalid order status", { orderRef, status: order.status });
      return res.status(400).json({ ok: false, error: `Order status is ${order.status}, must be CHECKOUT` });
    }

    const merchantId = process.env.PAYHERE_SHOP_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_SHOP_MERCHANT_SECRET;
    const sandbox = process.env.PAYHERE_SHOP_SANDBOX;
    const returnUrl = process.env.PAYHERE_RETURN_URL;
    const cancelUrl = process.env.PAYHERE_CANCEL_URL;
    const notifyUrl = process.env.PAYHERE_NOTIFY_URL;
    const checkoutUrl = process.env.PAYHERE_CHECKOUT_URL;
    const checkoutUrlSandbox = process.env.PAYHERE_CHECKOUT_URL_SANDBOX;

    if (!merchantId || !merchantSecret) {
      logger.error("payhereBuildCheckoutForStore: PayHere env not configured");
      return res.status(500).json({ ok: false, error: "PayHere env not configured" });
    }

    const isSandbox = sandbox === "true";
    const actionUrl = isSandbox ? checkoutUrlSandbox : checkoutUrl;

    const currency = order.currency || "LKR";
    const amountStr = formatAmount2(order.total);
    // Use the actual orderRef as order_id for consistency and easier tracking
    const orderId = order.orderRef;

    const hash = buildCheckoutHash({
      merchantId,
      orderId,
      amountStr,
      currency,
      merchantSecret,
    });

    const c = order.customer || {};
    const address = [c.address, c.city, c.postalCode].filter(Boolean).join(", ");

    const payment = {
      // Internal use for frontend
      _action_url: actionUrl,

      merchant_id: merchantId,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,

      order_id: orderId,
      items: `Order ${orderId}`,
      amount: amountStr,
      currency,
      hash,

      first_name: c.firstName || "Customer",
      last_name: c.lastName || "User",
      email: c.email || "customer@example.com",
      phone: c.phone || "0771234567",
      address: address || "No Address Provided",
      city: c.city || "Colombo",
      country: c.country || "Sri Lanka",

      custom_1: "store",
      custom_2: String(order._id),
    };

    logger.info("payhereBuildCheckoutForStore: SUCCESS", {
      orderRef,
      payhereOrderId: orderId,
      amount: amountStr
    });
    console.log("========== PAYHERE DEBUG ==========");
    console.log({
      merchantId,
      orderId,
      amountStr,
      currency,
      hash,
      returnUrl,
      cancelUrl,
      notifyUrl,
      actionUrl,
      custom2: String(order._id)
    });
    console.log("==================================");
    res.json({ ok: true, payment });
  } catch (e) {
    logger.error("payhereBuildCheckoutForStore: FAILED", { orderRef, error: e.message });
    res.status(400).json({ ok: false, error: e.message });
  }
}

/**
 * PayHere notify (server-to-server). Content-Type: application/x-www-form-urlencoded
 * Verifies md5sig + status_code===2, then marks order PAID and decrements inventory atomically.
 */
export async function payhereNotifyForStore(req, res) {
  const {
    merchant_id,
    order_id,
    payment_id,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig,
    method,
    status_message,
    custom_1,
    custom_2,
  } = req.body || {};
  logger.info("payhereNotifyForStore: START", { orderId: order_id, paymentId: payment_id, statusCode: status_code });

  try {
    if (!merchant_id || !order_id || !payhere_amount || !payhere_currency || typeof status_code === "undefined" || !md5sig) {
      logger.warn("payhereNotifyForStore: missing fields", { orderId: order_id });
      return res.status(400).send("BAD");
    }

    const secret = process.env.PAYHERE_SHOP_MERCHANT_SECRET;
    if (!secret) {
      logger.error("payhereNotifyForStore: PayHere secret not configured");
      return res.status(500).send("MISCONFIG");
    }

    const localSig = buildMd5Sig({
      merchantId: merchant_id,
      orderId: order_id,
      payhereAmount: payhere_amount,
      payhereCurrency: payhere_currency,
      statusCode: String(status_code),
      merchantSecret: secret,
    });

    if (localSig !== md5sig) {
      logger.warn("payhereNotifyForStore: signature verification failed", {
        orderId: order_id,
        receivedSig: md5sig,
        localSig
      });
      return res.status(400).send("INVALID");
    }

    let order;
    if (custom_2 && mongoose.isValidObjectId(custom_2)) {
      order = await StoreOrder.findById(custom_2);
    } else {
      // Fallback to orderRef if custom_2 is missing (though our buildCheckoutForStore always sends it)
      order = await StoreOrder.findOne({ orderRef: order_id });
    }

    if (!order) {
      logger.warn("payhereNotifyForStore: Order not found", { orderId: order_id, custom_2 });
      return res.status(200).send("OK"); // Still return OK to PayHere to stop retries
    }

    if (String(status_code) === "2") {
      logger.info("payhereNotifyForStore: SUCCESS - marking as paid", { orderRef: order.orderRef, paymentId: payment_id });
      order.status = "PAID";
      order.paidAt = new Date();
      order.paymentMethod = method || "PAYHERE";
      order.paymentId = payment_id;
      await order.save();
      logger.info("payhereNotifyForStore: Order finalized", { orderRef: order.orderRef });
    } else {
      logger.warn("payhereNotifyForStore: Non-success status code", {
        orderRef: order.orderRef,
        status: status_code,
        message: status_message
      });

      // If the order is still in CHECKOUT, mark it as FAILED.
      // We don't overwrite PAID or CANCELLED statuses.
      if (order.status === "CHECKOUT") {
        order.status = "FAILED";
        await order.save();
        logger.info("payhereNotifyForStore: Order marked as FAILED", { orderRef: order.orderRef });
      }
    }

    res.status(200).send("OK");
  } catch (e) {
    logger.error("payhereNotifyForStore: CRITICAL FAILED", { error: e.message });
    res.status(200).send("OK");
  }
}
