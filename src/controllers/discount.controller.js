import Discount from "../models/Discount.model.js";
import logger from "../utils/logger.js";

const C = "[discountController]";

export const createDiscount = async (req, res) => {
  logger.info(`${C} createDiscount: START`);
  try {
    const { code, percentage } = req.body;
    if (!code || percentage == null) {
      return res.status(400).json({ ok: false, error: "Code and percentage are required" });
    }

    const uppercaseCode = code.trim().toUpperCase();

    const existing = await Discount.findOne({ code: uppercaseCode });
    if (existing) {
      return res.status(400).json({ ok: false, error: "Discount code already exists" });
    }

    const discount = await Discount.create({
      code: uppercaseCode,
      percentage: Number(percentage),
      isActive: true,
    });

    res.json({ ok: true, discount });
  } catch (e) {
    logger.error(`${C} createDiscount: FAILED`, { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
};

export const getDiscounts = async (req, res) => {
  logger.info(`${C} getDiscounts: START`);
  try {
    const discounts = await Discount.find().sort({ createdAt: -1 });
    res.json({ ok: true, discounts });
  } catch (e) {
    logger.error(`${C} getDiscounts: FAILED`, { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
};

export const toggleDiscount = async (req, res) => {
  logger.info(`${C} toggleDiscount: START`);
  try {
    const { id } = req.params;
    const discount = await Discount.findById(id);
    if (!discount) {
      return res.status(404).json({ ok: false, error: "Discount not found" });
    }

    discount.isActive = !discount.isActive;
    await discount.save();

    res.json({ ok: true, discount });
  } catch (e) {
    logger.error(`${C} toggleDiscount: FAILED`, { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
};

export const deleteDiscount = async (req, res) => {
  logger.info(`${C} deleteDiscount: START`);
  try {
    const { id } = req.params;
    const discount = await Discount.findByIdAndDelete(id);
    if (!discount) {
      return res.status(404).json({ ok: false, error: "Discount not found" });
    }

    res.json({ ok: true });
  } catch (e) {
    logger.error(`${C} deleteDiscount: FAILED`, { error: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
};
