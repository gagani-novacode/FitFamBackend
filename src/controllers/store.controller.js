//import crypto from "crypto";
import mongoose from "mongoose";
import Product from "../models/Product.model.js";
import StoreOrder from "../models/StoreOrder.model.js";
import Discount from "../models/Discount.model.js";
import Sale from "../models/Sale.model.js";
import logger from "../utils/logger.js";
import nodemailer from "nodemailer";

// --- Config & Helpers --------------------------------------------------------------------

let _transporter = null;
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    _transporter.verify((err, ok) => {
      if (err) console.error("❌ SMTP verify failed:", err.message);
      else console.log("✅ SMTP ready");
    });
  }
  return _transporter;
}

// Note: Admin authentication is handled by the protect + admin middleware
// on the router level (admin.routes.js). No controller-level check needed.

/** Basic HTML escaping helper */
const escapeHTML = (str) => {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
};

const sendEmail = async (options) => {
  if (!options.from) options.from = process.env.FROM_EMAIL || 'Saraku Store <store@saraku.com>';
  logger.info("Initiating email send", { to: options.to, subject: options.subject });
  try {
    const info = await getTransporter().sendMail(options);
    logger.info("Email sent successfully", { messageId: info.messageId, to: options.to });
    return true;
  } catch (err) {
    console.error("sendEmail utility threw an error:", err);
    logger.error("Failed to send email", { error: err.message, to: options.to });
    return false;
  }
};

// --- Product Admin Endpoints -------------------------------------------------------------

export const createProduct = async (req, res) => {
  logger.info("createProduct: START", { name: req.body.name });
  try {
    const {
      name, category, subCategory, price, originalPrice, description,
      sizes, stock, images, isNewProduct, isSale, badge, tags
    } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ ok: false, error: "name, category, price are required" });
    }

    const product = await Product.create({
      name: escapeHTML(name),
      category: escapeHTML(category),
      subCategory: escapeHTML(subCategory || ""),
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      description: escapeHTML(description),
      images: Array.isArray(images) ? images : [],
      sizes: Array.isArray(sizes) ? sizes : [],
      stock: typeof stock === "object" ? stock : {},
      isNewProduct: !!isNewProduct,
      isSale: !!isSale,
      badge: escapeHTML(badge),
      tags: Array.isArray(tags) ? tags.map(escapeHTML) : [],
    });

    logger.info("createProduct: SUCCESS", { productId: product._id });
    res.status(201).json({ ok: true, product });
  } catch (e) {
    logger.error("createProduct: FAILED", { error: e.message });
    res.status(e.status || 400).json({ ok: false, error: e.message });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  logger.info("updateProduct: START", { productId: id });
  try {
    const updates = { ...req.body };
    if (updates.name) updates.name = escapeHTML(updates.name);
    if (updates.description) updates.description = escapeHTML(updates.description);

    const updated = await Product.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!updated) {
      logger.warn("updateProduct: Product not found", { productId: id });
      return res.status(404).json({ ok: false, error: "Product not found" });
    }

    logger.info("updateProduct: SUCCESS", { productId: id });
    res.json({ ok: true, product: updated });
  } catch (e) {
    logger.error("updateProduct: FAILED", { productId: id, error: e.message });
    res.status(400).json({ ok: false, error: e.message });
  }
};

export const patchProduct = async (req, res) => {
  const { id } = req.params;
  logger.info("patchProduct: START", { productId: id });
  try {
    const updates = { ...req.body };
    if (updates.name) updates.name = escapeHTML(updates.name);
    if (updates.description) updates.description = escapeHTML(updates.description);

    const updated = await Product.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!updated) {
      logger.warn("patchProduct: Product not found", { productId: id });
      return res.status(404).json({ ok: false, error: "Product not found" });
    }

    logger.info("patchProduct: SUCCESS", { productId: id });
    res.json({ ok: true, product: updated });
  } catch (e) {
    logger.error("patchProduct: FAILED", { productId: id, error: e.message });
    res.status(400).json({ ok: false, error: e.message });
  }
};

// --- Store Public Endpoints -------------------------------------------------------------

// Helper: get active sale (cached per request is fine; DB is fast)
const getActiveSaleDoc = async () => {
  const now = new Date();
  return Sale.findOne({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } });
};

export const listProducts = async (req, res) => {
  const C = "[storeController]";
  logger.info(`${C} :: listProducts() : Start`);
  try {
    const products = await Product.find().lean();

    // Attach sale pricing if an active sale exists
    const activeSale = await getActiveSaleDoc();
    const enriched = products.map((p) => {
      if (!activeSale) return p;
      const productIdStr = p._id.toString();
      const discountAmt = activeSale.products.get
        ? activeSale.products.get(productIdStr)
        : activeSale.products[productIdStr];

      if (discountAmt && discountAmt > 0) {
        const salePrice = Math.max(0, p.price - discountAmt);
        return {
          ...p,
          salePrice,
          saleDiscountAmount: discountAmt,
          saleId: activeSale._id,
          saleName: activeSale.name,
          isSale: true,
          originalPrice: p.price,
        };
      }
      return p;
    });

    logger.info(`${C} :: listProducts() : End | ${enriched.length} products`);
    res.json({ ok: true, products: enriched });
  } catch (e) {
    logger.error(`${C} :: listProducts() : Failed | ${e.message}`);
    res.status(500).json({ ok: false, error: e.message });
  }
};

export const getProductById = async (req, res) => {
  const C = "[storeController]";
  const { id } = req.params;
  logger.info(`${C} :: getProductById() : Start`);
  try {
    const product = await Product.findById(id).lean();
    if (!product) {
      logger.warn(`${C} :: getProductById() : Failed | Product not found | ${id}`);
      return res.status(404).json({ ok: false, error: "Product not found" });
    }
    logger.info(`${C} :: getProductById() : End`);
    res.json({ ok: true, product });
  } catch (e) {
    logger.error(`${C} :: getProductById() : Failed | ${e.message}`);
    res.status(400).json({ ok: false, error: e.message });
  }
};

// --- Cart & Order Lifecycle -------------------------------------------------------------

export const getCart = async (req, res) => {
  const C = "[storeController]";
  const { orderRef } = req.query;
  logger.info(`${C} :: getCart() : Start`);
  try {
    if (!orderRef) {
      const newRef = crypto.randomUUID();
      const cart = await StoreOrder.create({ status: "CART" });
      logger.info(`${C} :: getCart() : End | New Cart`);
      return res.json({ ok: true, cart });
    }
    const cart = await StoreOrder.findOne({ orderRef, status: "CART" }).populate("items.product");
    if (!cart) {
      logger.warn(`${C} :: getCart() : Failed | Cart not found | ${orderRef}`);
      return res.status(404).json({ ok: false, error: "Cart not found or already processed" });
    }
    logger.info(`${C} :: getCart() : End`);
    res.json({ ok: true, cart });
  } catch (e) {
    logger.error(`${C} :: getCart() : Failed | ${e.message}`);
    res.status(400).json({ ok: false, error: e.message });
  }
};

const recalculateCartTotal = (cart) => {
  const subtotal = cart.items.reduce((acc, it) => acc + it.lineTotal, 0);
  const delivery = cart.items.length > 0 ? 500 : 0;
  
  cart.discountAmount = 0;
  if (cart.discountPercentage && cart.discountPercentage > 0) {
    cart.discountAmount = Math.round(subtotal * (cart.discountPercentage / 100));
  }
  
  cart.total = subtotal - cart.discountAmount + delivery;
};

export const addToCart = async (req, res) => {
  const C = "[storeController]";
  const { orderRef, productId, size, qty = 1 } = req.body;
  logger.info(`${C} :: addToCart() : Start`);
  try {
    if (!size) {
      return res.status(400).json({ ok: false, error: "Size is required" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ ok: false, error: "Product not found" });
    }

    // Determine effective unit price (apply sale if active)
    let unitPrice = product.price;
    const activeSale = await getActiveSaleDoc();
    if (activeSale) {
      const discountAmt = activeSale.products.get
        ? activeSale.products.get(productId.toString())
        : activeSale.products[productId.toString()];
      if (discountAmt && discountAmt > 0) {
        unitPrice = Math.max(0, product.price - discountAmt);
      }
    }

    let cart = await StoreOrder.findOne({ orderRef, status: "CART" });
    if (!cart) {
      cart = await StoreOrder.create({ status: "CART" });
    }

    const itemIndex = cart.items.findIndex(it => it.product.toString() === productId && it.size === size);
    if (itemIndex > -1) {
      cart.items[itemIndex].qty += Math.max(0, Number(qty));
      cart.items[itemIndex].lineTotal = cart.items[itemIndex].unitPrice * cart.items[itemIndex].qty;
    } else {
      cart.items.push({
        product: productId,
        size: size,
        qty: Math.max(1, Number(qty)),
        unitPrice,
        lineTotal: unitPrice * Math.max(1, Number(qty))
      });
    }

    recalculateCartTotal(cart);
    await cart.save();

    logger.info(`${C} :: addToCart() : End`);
    res.json({ ok: true, cart });
  } catch (e) {
    logger.error(`${C} :: addToCart() : Failed | ${e.message}`);
    res.status(400).json({ ok: false, error: e.message });
  }
};

export const removeFromCart = async (req, res) => {
  const C = "[storeController]";
  const { orderRef, productId, size } = req.body;
  logger.info(`${C} :: removeFromCart() : Start`);
  try {
    const cart = await StoreOrder.findOne({ orderRef, status: "CART" });
    if (!cart) {
      return res.status(404).json({ ok: false, error: "Cart not found" });
    }

    cart.items = cart.items.filter(it => !(it.product.toString() === productId && it.size === size));
    recalculateCartTotal(cart);
    await cart.save();

    logger.info(`${C} :: removeFromCart() : End`);
    res.json({ ok: true, cart });
  } catch (e) {
    logger.error(`${C} :: removeFromCart() : Failed | ${e.message}`);
    res.status(400).json({ ok: false, error: e.message });
  }
};

export const updateCartQty = async (req, res) => {
  const C = "[storeController]";
  const { orderRef, productId, size, qty } = req.body;
  logger.info(`${C} :: updateCartQty() : Start`);
  try {
    const cart = await StoreOrder.findOne({ orderRef, status: "CART" });
    if (!cart) {
      return res.status(404).json({ ok: false, error: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(it => it.product.toString() === productId && it.size === size);
    if (itemIndex === -1) {
      return res.status(404).json({ ok: false, error: "Item not in cart" });
    }

    const newQty = Math.max(0, Number(qty));
    if (newQty === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].qty = newQty;
      cart.items[itemIndex].lineTotal = cart.items[itemIndex].unitPrice * newQty;
    }

    recalculateCartTotal(cart);
    await cart.save();

    logger.info(`${C} :: updateCartQty() : End`);
    res.json({ ok: true, cart });
  } catch (e) {
    logger.error(`${C} :: updateCartQty() : Failed | ${e.message}`);
    res.status(400).json({ ok: false, error: e.message });
  }
};

export const validateDiscount = async (req, res) => {
  const { code } = req.params;
  try {
    const uppercaseCode = code.trim().toUpperCase();
    const discount = await Discount.findOne({ code: uppercaseCode });
    if (!discount || !discount.isActive) {
      return res.status(404).json({ ok: false, error: "Invalid or inactive discount code" });
    }
    res.json({ ok: true, percentage: discount.percentage });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};

export const applyDiscount = async (req, res) => {
  const C = "[storeController]";
  const { orderRef, code } = req.body;
  logger.info(`${C} :: applyDiscount() : Start`);
  try {
    if (!code) {
      return res.status(400).json({ ok: false, error: "Discount code is required" });
    }

    const cart = await StoreOrder.findOne({ orderRef, status: "CART" });
    if (!cart) {
      return res.status(404).json({ ok: false, error: "Cart not found" });
    }

    const uppercaseCode = code.trim().toUpperCase();
    const discount = await Discount.findOne({ code: uppercaseCode });

    if (!discount) {
      return res.status(404).json({ ok: false, error: "Invalid discount code" });
    }
    if (!discount.isActive) {
      return res.status(400).json({ ok: false, error: "Discount code is no longer active" });
    }

    cart.discountCode = uppercaseCode;
    cart.discountPercentage = discount.percentage;
    recalculateCartTotal(cart);
    await cart.save();

    logger.info(`${C} :: applyDiscount() : End`);
    res.json({ ok: true, cart });
  } catch (e) {
    logger.error(`${C} :: applyDiscount() : Failed | ${e.message}`);
    res.status(400).json({ ok: false, error: e.message });
  }
};

export const removeDiscount = async (req, res) => {
  const C = "[storeController]";
  const { orderRef } = req.body;
  logger.info(`${C} :: removeDiscount() : Start`);
  try {
    const cart = await StoreOrder.findOne({ orderRef, status: "CART" });
    if (!cart) {
      return res.status(404).json({ ok: false, error: "Cart not found" });
    }

    cart.discountCode = undefined;
    cart.discountPercentage = 0;
    cart.discountAmount = 0;
    recalculateCartTotal(cart);
    await cart.save();

    logger.info(`${C} :: removeDiscount() : End`);
    res.json({ ok: true, cart });
  } catch (e) {
    logger.error(`${C} :: removeDiscount() : Failed | ${e.message}`);
    res.status(400).json({ ok: false, error: e.message });
  }
};

export const moveToCheckout = async (req, res) => {
  const C = "[storeController]";
  const { orderRef, customer } = req.body;
  logger.info(`${C} :: moveToCheckout() : Start`);
  const session = await mongoose.startSession();
  try {
    let order;

    await session.withTransaction(async () => {
      order = await StoreOrder.findOne({ orderRef, status: "CART" }).session(session);
      if (!order || order.items.length === 0) throw new Error("Cart is empty or invalid");

      if (!customer || !customer.email || !customer.firstName || !customer.phone) {
        throw new Error("Customer details (firstName, email, phone) are required for checkout");
      }

      for (const it of order.items) {
        // Decrease stock for the specific size
        const stockKey = `stock.${it.size}`;
        const query = { _id: it.product };
        query[stockKey] = { $gte: it.qty };

        const update = { $inc: {} };
        update.$inc[stockKey] = -it.qty;

        const res = await Product.updateOne(query, update, { session });
        if (res.modifiedCount !== 1) {
          throw new Error(`Insufficient stock for one or more items (Size: ${it.size})`);
        }
      }

      const sanitizedCustomer = {
        firstName: escapeHTML(customer.firstName),
        lastName: escapeHTML(customer.lastName),
        email: customer.email.toLowerCase().trim(),
        phone: escapeHTML(customer.phone),
        address: escapeHTML(customer.address),
        city: escapeHTML(customer.city),
        country: escapeHTML(customer.country),
        postalCode: escapeHTML(customer.postalCode),
      };

      order.status = "CHECKOUT";
      order.customer = sanitizedCustomer;
      order.checkoutAt = new Date();
      await order.save({ session });
    });

    logger.info(`${C} :: moveToCheckout() : End`);
    res.json({ ok: true, order });
  } catch (e) {
    logger.warn(`${C} :: moveToCheckout() : Failed | ${e.message}`);
    res.status(400).json({ ok: false, error: e.message });
  } finally {
    session.endSession();
  }
};

export const markAsPaid = async (req, res) => {
  const C = "[storeController]";
  const { orderRef, paymentDetails } = req.body;
  logger.info(`${C} :: markAsPaid() : Start`);
  try {
    const order = await StoreOrder.findOne({ orderRef, status: "CHECKOUT" }).populate("items.product");
    if (!order) {
      logger.warn(`${C} :: markAsPaid() : Failed | Order not found | ${orderRef}`);
      return res.status(404).json({ ok: false, error: "Order not found in checkout state" });
    }

    order.status = "PAID";
    order.paidAt = new Date();
    order.paymentMethod = escapeHTML(paymentDetails.method);
    order.paymentId = escapeHTML(paymentDetails.id);
    await order.save();

    await sendOrderPaidEmail(order);

    logger.info(`${C} :: markAsPaid() : End`);
    res.json({ ok: true, order });
  } catch (e) {
    logger.error(`${C} :: markAsPaid() : Failed | ${e.message}`);
    res.status(400).json({ ok: false, error: e.message });
  }
};

export const cleanupExpiredOrders = async (req, res) => {
  logger.info("cleanupExpiredOrders: START");
  const session = await mongoose.startSession();
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredOrders = await StoreOrder.find({
      status: { $in: ["CHECKOUT", "FAILED"] },
      checkoutAt: { $lt: oneDayAgo }
    });

    logger.info("cleanupExpiredOrders: Found expired orders", { count: expiredOrders.length });
    let count = 0;
    for (const order of expiredOrders) {
      await session.withTransaction(async () => {
        logger.debug("cleanupExpiredOrders: Releasing inventory for order", { orderRef: order.orderRef });
        for (const it of order.items) {
          const stockKey = `stock.${it.size}`;
          const update = { $inc: {} };
          update.$inc[stockKey] = it.qty;

          await Product.updateOne(
            { _id: it.product },
            update,
            { session }
          );
        }
        order.status = "EXPIRED";
        await order.save({ session });
      });
      count++;
    }

    logger.info("cleanupExpiredOrders: SUCCESS", { cleaned: count });
    if (res) res.json({ ok: true, cleaned: count });
  } catch (e) {
    logger.error("cleanupExpiredOrders: FAILED", { error: e.message });
    if (res) res.status(500).json({ ok: false, error: e.message });
  } finally {
    session.endSession();
    logger.debug("cleanupExpiredOrders: session ended");
  }
};

export const getOrderStatus = async (req, res) => {
  const { orderRef } = req.params;
  logger.info("[storeController] :: getOrderStatus() : Start", { orderRef });
  try {
    const order = await StoreOrder.findOne({ orderRef }).lean();
    if (!order) {
      logger.warn("[storeController] :: getOrderStatus() : Failed | Order not found", { orderRef });
      return res.status(404).json({ ok: false, error: "Order not found" });
    }
    logger.info("[storeController] :: getOrderStatus() : End", { orderRef, status: order.status });
    res.json({ ok: true, status: order.status, order });
  } catch (e) {
    logger.error("[storeController] :: getOrderStatus() : Failed", { orderRef, error: e.message });
    res.status(400).json({ ok: false, error: e.message });
  }
};

export const getMyOrders = async (req, res) => {
  const { email } = req.query;
  logger.info("[storeController] :: getMyOrders() : Start", { email });
  try {
    if (!email) {
      return res.status(400).json({ ok: false, error: "Email query param is required" });
    }
    const orders = await StoreOrder.find({
      "customer.email": email.toLowerCase().trim(),
      status: { $ne: "CART" }
    })
      .populate("items.product")
      .sort({ createdAt: -1 })
      .lean();

    logger.info("[storeController] :: getMyOrders() : Success", { count: orders.length });
    res.json({ ok: true, count: orders.length, orders });
  } catch (e) {
    logger.error("[storeController] :: getMyOrders() : Failed", { email, error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
};

// --- Internal Helper for Email ----------------------------------------------------------

async function sendOrderPaidEmail(order) {
  const customerName = escapeHTML(order.customer.firstName);
  const orderRef = escapeHTML(order.orderRef);
  const totalAmount = order.total || 0;
  const deliveryFee = 500;
  const subtotal = order.items.reduce((acc, it) => acc + (it.unitPrice * it.qty), 0);
  const discountAmount = order.discountAmount || 0;
  const discountPercentage = order.discountPercentage || 0;
  const discountCode = order.discountCode || '';

  const discountRow = discountAmount > 0 ? `
    <tr>
      <td style="padding: 6px 0; font-size: 13px; color: #555555;">Discount (${discountPercentage}% - ${escapeHTML(discountCode)})</td>
      <td align="right" style="padding: 6px 0; font-size: 13px; color: #E5003B;">- LKR ${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
    </tr>
  ` : '';

  // Build items rows
  const itemRows = order.items.map(item => {
    const name = escapeHTML(item.product?.name || 'Active Wear Product');
    const size = escapeHTML(item.size || 'M');
    const qty = item.qty || 1;
    const price = item.unitPrice || 0;
    const lineTotal = price * qty;

    return `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #111111; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <div style="font-weight: 600;">${name}</div>
          <div style="font-size: 11px; color: #888888; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px;">Size: ${size}</div>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #555555; text-align: center; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          ${qty}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eeeeee; font-size: 14px; color: #111111; text-align: right; font-weight: 600; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          LKR ${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmed</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f6f6f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f6f6f6; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e9e9e9; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
              
              <!-- Header -->
              <tr>
                <td style="background-color: #111111; padding: 40px 20px; text-align: center;">
                  <div style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 6px; text-transform: uppercase; margin-bottom: 5px;">FITFAM</div>
                  <div style="font-size: 9px; font-weight: 400; color: #888888; letter-spacing: 8px; text-transform: uppercase;">Active Premium</div>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h1 style="font-size: 20px; font-weight: 400; color: #111111; margin-top: 0; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 2px;">Order Confirmed</h1>
                  <p style="font-size: 14px; line-height: 1.6; color: #555555; margin-bottom: 30px;">
                    Hi ${customerName},<br>
                    Thank you for shopping with FitFam Active. Your payment was successful, and we've received your order. We are now preparing it for shipment.
                  </p>

                  <!-- Order Summary -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 2px solid #111111; padding-bottom: 8px; margin-bottom: 15px;">
  <tr>
    <td style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #111111;">
      Order Details
    </td>
    <td align="right" style="font-size: 11px; color: #888888; white-space: nowrap;">
      Ref: ${orderRef}
    </td>
  </tr>
</table>

                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 25px;">
                    <thead>
                      <tr>
                        <th align="left" style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888888; padding-bottom: 8px; border-bottom: 1px solid #111111;">Item</th>
                        <th align="center" style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888888; padding-bottom: 8px; border-bottom: 1px solid #111111; width: 60px;">Qty</th>
                        <th align="right" style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888888; padding-bottom: 8px; border-bottom: 1px solid #111111; width: 120px;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemRows}
                    </tbody>
                  </table>

                  <!-- Totals -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #555555;">Subtotal</td>
                      <td align="right" style="padding: 6px 0; font-size: 13px; color: #111111;">LKR ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    ${discountRow}
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #555555;">Delivery</td>
                      <td align="right" style="padding: 6px 0; font-size: 13px; color: #111111;">LKR ${deliveryFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr style="font-weight: 700; font-size: 16px;">
                      <td style="padding: 15px 0 0 0; border-top: 1px dashed #dddddd; color: #111111; text-transform: uppercase; letter-spacing: 1px;">Total</td>
                      <td align="right" style="padding: 15px 0 0 0; border-top: 1px dashed #dddddd; color: #D4AF37; font-size: 18px;">LKR ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </table>

                  <!-- Delivery Address -->
                  <div style="background-color: #fcfcfc; border: 1px solid #eeeeee; padding: 20px; margin-bottom: 30px;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #111111; margin-bottom: 8px;">Delivery Address</div>
                    <div style="font-size: 13px; line-height: 1.5; color: #555555;">
                      ${escapeHTML(order.customer.address)}<br>
                      ${escapeHTML(order.customer.city)}, ${escapeHTML(order.customer.postalCode || '')}<br>
                      ${escapeHTML(order.customer.country)}<br>
                      <span style="font-size: 12px; color: #888888;">Phone: ${escapeHTML(order.customer.phone)}</span>
                    </div>
                  </div>

                  <!-- Button -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center">
                        <a href="https://frost-simpson-choose-annotated.trycloudflare.com/account" style="display: inline-block; background-color: #111111; color: #ffffff; text-decoration: none; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; padding: 15px 30px; border: 2px solid #111111; transition: all 0.3s ease;">Track Your Order</a>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #fafafa; padding: 30px; border-top: 1px solid #eeeeee; text-align: center;">
                  <p style="font-size: 12px; color: #888888; margin: 0 0 10px 0;">
                    Need help? Contact our support team at <a href="mailto:support@fitfam.com" style="color: #111111; text-decoration: underline;">support@fitfam.com</a>
                  </p>
                  <p style="font-size: 11px; color: #aaaaaa; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                    &copy; 2026 FITFAM ACTIVE. ALL RIGHTS RESERVED.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: order.customer.email,
    subject: `FitFam Active Order Confirmed: ${order.orderRef}`,
    html
  });
}

// --- Admin Orders View ------------------------------------------------------------------

export const getPaidStoreOrders = async (req, res) => {
  logger.info("getPaidStoreOrders: START");
  try {
    const orders = await StoreOrder.find({ status: "PAID" })
      .populate("items.product")
      .sort({ createdAt: -1 })
      .lean();
    logger.info("getPaidStoreOrders: SUCCESS", { count: orders.length });
    res.json({ ok: true, total: orders.length, orders });
  } catch (e) {
    logger.error("getPaidStoreOrders: FAILED", { error: e.message });
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
};

export const getAnalytics = async (req, res) => {
  logger.info("getAnalytics: START");
  try {
    // Statuses that count as "revenue generated"
    const revenueStatuses = { status: { $in: ["PAID", "DISPATCHED", "COMPLETED"] } };

    // 1. Summary Metrics
    const totalRevenue = await StoreOrder.aggregate([
      { $match: revenueStatuses },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);

    const paidOrdersCount = await StoreOrder.countDocuments(revenueStatuses);
    const pendingOrdersCount = await StoreOrder.countDocuments({ status: "CHECKOUT" });
    const totalProductsCount = await Product.countDocuments();

    // 2. Sales Over Last 30 Days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySales = await StoreOrder.aggregate([
      {
        $match: {
          ...revenueStatuses,
          paidAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Top Products
    const topProducts = await StoreOrder.aggregate([
      { $match: revenueStatuses },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalQty: { $sum: "$items.qty" },
          totalRevenue: { $sum: "$items.lineTotal" }
        }
      },
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" }
    ]);

    logger.info("getAnalytics: SUCCESS");
    res.json({
      ok: true,
      summary: {
        totalRevenue: totalRevenue[0]?.total || 0,
        paidOrders: paidOrdersCount,
        pendingOrders: pendingOrdersCount,
        totalProducts: totalProductsCount
      },
      dailySales,
      topProducts
    });
  } catch (e) {
    logger.error("getAnalytics: FAILED", { error: e.message });
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
};

// --- Admin: All Orders (PAID + CHECKOUT) -----------------------------------------------

export const getAllOrders = async (req, res) => {
  logger.info("getAllOrders: START");
  try {
    const orders = await StoreOrder.find({ status: { $in: ["PAID", "CHECKOUT", "DISPATCHED", "COMPLETED"] } })
      .populate("items.product")
      .sort({ createdAt: -1 })
      .lean();
    logger.info("getAllOrders: SUCCESS", { count: orders.length });
    res.json({ ok: true, total: orders.length, orders });
  } catch (e) {
    logger.error("getAllOrders: FAILED", { error: e.message });
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
};

// --- Admin: Update Order Status --------------------------------------------------------

export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  logger.info("updateOrderStatus: START", { orderId: id, status });
  try {
    const allowed = ["DISPATCHED", "COMPLETED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ ok: false, error: `Status must be one of: ${allowed.join(", ")}` });
    }

    const order = await StoreOrder.findById(id);
    if (!order) {
      return res.status(404).json({ ok: false, error: "Order not found" });
    }

    // ── Valid transitions ──────────────────────────────────────
    const validTransitions = {
      PAID: "DISPATCHED",
      DISPATCHED: "COMPLETED",
    };

    if (validTransitions[order.status] !== status) {
      return res.status(400).json({
        ok: false,
        error: `Cannot transition from ${order.status} to ${status}. Expected: ${validTransitions[order.status] || 'no transition available'}`
      });
    }

    order.status = status;
    await order.save();

    logger.info("updateOrderStatus: SUCCESS", { orderId: id, status });
    res.json({ ok: true, order });
  } catch (e) {
    logger.error("updateOrderStatus: FAILED", { error: e.message });
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
};