import crypto from "crypto";
import mongoose from "mongoose";
import Product from "../models/Product.model.js";
import StoreOrder from "../models/StoreOrder.model.js";
import logger from "../utils/logger.js";
import nodemailer from "nodemailer";

// --- Config & Helpers --------------------------------------------------------------------
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Saraku Store <store@saraku.com>';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

/** Timing-safe comparison for Admin Token */
const assertAdmin = (req) => {
  const adminToken = process.env.ADMIN_TOKEN;
  const providedToken = req.headers["x-admin-token"];

  if (!adminToken || !providedToken) {
    logger.warn("Admin access denied: Missing Credentials", { path: req.path });
    const err = new Error("Unauthorized: Missing Credentials");
    err.status = 401;
    throw err;
  }

  try {
    const bufA = Buffer.from(adminToken);
    const bufB = Buffer.from(providedToken);

    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      logger.warn("Admin access denied: Invalid Token", { path: req.path });
      const err = new Error("Unauthorized: Invalid Admin Token");
      err.status = 401;
      throw err;
    }
  } catch (e) {
    logger.error("Admin assertion error", { error: e.message });
    const err = new Error("Unauthorized: Access Denied");
    err.status = 401;
    throw err;
  }
};

/** Basic HTML escaping helper */
const escapeHTML = (str) => {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
};

const sendEmail = async (options) => {
  logger.info("Initiating email send", { to: options.to, subject: options.subject });
  try {
    const info = await transporter.sendMail(options);
    logger.info("Email sent successfully", { messageId: info.messageId, to: options.to });
    return true;
  } catch (err) {
    logger.error("Failed to send email", { error: err.message, to: options.to });
    return false;
  }
};

// --- Product Admin Endpoints -------------------------------------------------------------

export const createProduct = async (req, res) => {
  logger.info("createProduct: START", { name: req.body.name });
  try {
    assertAdmin(req);
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
    assertAdmin(req);
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
    assertAdmin(req);
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

export const listProducts = async (req, res) => {
  const C = "[storeController]";
  logger.info(`${C} :: listProducts() : Start`);
  try {
    const { category, subCategory } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    const products = await Product.find().lean();
    logger.info(`${C} :: listProducts() : End`);
    res.json({ ok: true, products });
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
      const cart = await StoreOrder.create({ orderRef: newRef, status: "CART" });
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

    let cart = await StoreOrder.findOne({ orderRef, status: "CART" });
    if (!cart) {
      cart = await StoreOrder.create({ orderRef: orderRef || crypto.randomUUID(), status: "CART" });
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
        unitPrice: product.price,
        lineTotal: product.price * Math.max(1, Number(qty))
      });
    }

    cart.total = cart.items.reduce((acc, it) => acc + it.lineTotal, 0) + 400;
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
    cart.total = cart.items.reduce((acc, it) => acc + it.lineTotal, 0) + (cart.items.length > 0 ? 400 : 0);
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

    cart.total = cart.items.reduce((acc, it) => acc + it.lineTotal, 0) + (cart.items.length > 0 ? 400 : 0);
    await cart.save();

    logger.info(`${C} :: updateCartQty() : End`);
    res.json({ ok: true, cart });
  } catch (e) {
    logger.error(`${C} :: updateCartQty() : Failed | ${e.message}`);
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
    const order = await StoreOrder.findOne({ orderRef, status: "CHECKOUT" });
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
  const html = `
    <h1 style="color: #1f2937">Thank you for your order, ${customerName}!</h1>
    <p>Order Ref: <strong>${escapeHTML(order.orderRef)}</strong></p>
    <p>Total: <strong>LKR ${order.total.toLocaleString()}</strong></p>
    <p>Status: <span style="color: green; font-weight: bold;">PAID</span></p>
    <p>We will notify you once your items are dispatched.</p>
  `;
  return sendEmail({
    to: order.customer.email,
    subject: `Saraku Order Confirmed: ${order.orderRef}`,
    html
  });
}

// --- Admin Orders View ------------------------------------------------------------------

export const getPaidStoreOrders = async (req, res) => {
  logger.info("getPaidStoreOrders: START");
  try {
    assertAdmin(req);
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
    assertAdmin(req);

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
    assertAdmin(req);
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
    assertAdmin(req);

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