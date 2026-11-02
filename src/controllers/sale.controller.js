import Sale from "../models/Sale.model.js";
import Product from "../models/Product.model.js";
import logger from "../utils/logger.js";
import { notifySubscribersAboutOffer } from "../utils/saleNotification.util.js";

const C = "[saleController]";

// ── Shared helper: build offer product list from a sale and notify subscribers ──
async function triggerOfferNotification(sale) {
  try {
    const productMap = sale.products instanceof Map ? Object.fromEntries(sale.products) : (sale.products || {});
    const productIds = Object.keys(productMap);
    if (!productIds.length) return;

    const productsFromDb = await Product.find({ _id: { $in: productIds } }).lean();
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");

    const offerProducts = productsFromDb.map((p) => {
      const discount = Number(productMap[p._id.toString()] || 0);
      return {
        _id: p._id,
        name: p.name,
        image: p.images && p.images[0] ? p.images[0] : "",
        originalPrice: p.price,
        salePrice: Math.max(0, p.price - discount),
        discountAmount: discount,
        url: `${frontendUrl}/product/${p._id}`,
      };
    });

    await notifySubscribersAboutOffer({ saleName: sale.name, products: offerProducts });
  } catch (err) {
    logger.error(`${C} triggerOfferNotification: FAILED`, { error: err.message });
  }
}

// ── Admin: List all sales ──
export const getSales = async (req, res) => {
  logger.info(`${C} getSales: START`);
  try {
    const sales = await Sale.find().sort({ startDate: -1 });
    res.json({ ok: true, sales });
  } catch (e) {
    logger.error(`${C} getSales: FAILED`, { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
};

// ── Admin: Get single sale ──
export const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ ok: false, error: "Sale not found" });
    res.json({ ok: true, sale });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};

// ── Admin: Create sale ──
export const createSale = async (req, res) => {
  logger.info(`${C} createSale: START`);
  try {
    const { name, startDate, endDate, isActive, products } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ ok: false, error: "name, startDate, endDate are required" });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ ok: false, error: "endDate must be after startDate" });
    }

    const sale = await Sale.create({
      name: name.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      products: products || {},
    });

    logger.info(`${C} createSale: END | ${sale._id}`);
    res.json({ ok: true, sale });

    // Fire-and-forget: notify subscribers in the background after responding to admin
    if (sale.isActive) {
      setImmediate(() => triggerOfferNotification(sale));
    }
  } catch (e) {
    logger.error(`${C} createSale: FAILED`, { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
};

// ── Admin: Update sale ──
export const updateSale = async (req, res) => {
  logger.info(`${C} updateSale: START`);
  try {
    const { name, startDate, endDate, isActive, products } = req.body;
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ ok: false, error: "Sale not found" });

    const wasInactive = !sale.isActive;

    if (name !== undefined) sale.name = name.trim();
    if (startDate !== undefined) sale.startDate = new Date(startDate);
    if (endDate !== undefined) sale.endDate = new Date(endDate);
    if (isActive !== undefined) sale.isActive = Boolean(isActive);
    if (products !== undefined) sale.products = products;

    await sale.save();
    res.json({ ok: true, sale });

    // Notify subscribers only when:
    // 1. Sale is being newly activated (was inactive, now active), OR
    // 2. Products list is being updated on an already-active sale
    const justActivated = wasInactive && sale.isActive;
    const productsUpdated = products !== undefined;

    if (sale.isActive && (justActivated || productsUpdated)) {
      setImmediate(() => triggerOfferNotification(sale));
    }
  } catch (e) {
    logger.error(`${C} updateSale: FAILED`, { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
};

// ── Admin: Delete sale ──
export const deleteSale = async (req, res) => {
  logger.info(`${C} deleteSale: START`);
  try {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ ok: false, error: "Sale not found" });
    res.json({ ok: true });
  } catch (e) {
    logger.error(`${C} deleteSale: FAILED`, { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
};

// ── Public: Get currently active sale ──
export const getActiveSale = async (req, res) => {
  try {
    const now = new Date();
    const sale = await Sale.findOne({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ startDate: -1 });

    res.json({ ok: true, sale: sale || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
