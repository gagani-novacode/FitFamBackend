import SizeGuide from "../models/SizeGuide.model.js";
import Product from "../models/Product.model.js";
import logger from "../utils/logger.js";

// Seed standard size charts if collection is empty
const seedDefaultSizeGuides = async () => {
  const count = await SizeGuide.countDocuments();
  if (count === 0) {
    logger.info("[sizeGuideController] Seeding initial size guides...");
    const defaults = [
      {
        name: "Men's Tops & Tees",
        category: "Men",
        clothingType: "Tops",
        unit: "in",
        columns: ["Size", "Chest (in)", "Length (in)", "Shoulder (in)"],
        rows: [
          { "Size": "S", "Chest (in)": "38 - 40", "Length (in)": "28", "Shoulder (in)": "17.5" },
          { "Size": "M", "Chest (in)": "40 - 42", "Length (in)": "29", "Shoulder (in)": "18.5" },
          { "Size": "L", "Chest (in)": "42 - 44", "Length (in)": "30", "Shoulder (in)": "19.5" },
          { "Size": "XL", "Chest (in)": "44 - 46", "Length (in)": "31", "Shoulder (in)": "20.5" },
          { "Size": "XXL", "Chest (in)": "46 - 48", "Length (in)": "32", "Shoulder (in)": "21.5" },
        ],
        measurementNotes: "All measurements are in inches. Designed with an athletic drape.",
        isActive: true,
      },
      {
        name: "Men's Shorts & Bottoms",
        category: "Men",
        clothingType: "Bottoms",
        unit: "in",
        columns: ["Size", "Waist (in)", "Hip (in)", "Inseam (in)"],
        rows: [
          { "Size": "S", "Waist (in)": "29 - 31", "Hip (in)": "37 - 39", "Inseam (in)": "7" },
          { "Size": "M", "Waist (in)": "31 - 33", "Hip (in)": "39 - 41", "Inseam (in)": "7" },
          { "Size": "L", "Waist (in)": "33 - 35", "Hip (in)": "41 - 43", "Inseam (in)": "7.5" },
          { "Size": "XL", "Waist (in)": "35 - 38", "Hip (in)": "43 - 46", "Inseam (in)": "7.5" },
          { "Size": "XXL", "Waist (in)": "38 - 41", "Hip (in)": "46 - 49", "Inseam (in)": "8" },
        ],
        measurementNotes: "Elasticized waistband with internal drawstring. For a looser fit, size up.",
        isActive: true,
      },
      {
        name: "Women's Tops & Crop Tees",
        category: "Women",
        clothingType: "Tops",
        unit: "in",
        columns: ["Size", "Bust (in)", "Waist (in)", "Length (in)"],
        rows: [
          { "Size": "XS", "Bust (in)": "31 - 33", "Waist (in)": "24 - 26", "Length (in)": "16" },
          { "Size": "S", "Bust (in)": "33 - 35", "Waist (in)": "26 - 28", "Length (in)": "16.5" },
          { "Size": "M", "Bust (in)": "35 - 37", "Waist (in)": "28 - 30", "Length (in)": "17" },
          { "Size": "L", "Bust (in)": "37 - 40", "Waist (in)": "30 - 33", "Length (in)": "17.5" },
          { "Size": "XL", "Bust (in)": "40 - 43", "Waist (in)": "33 - 36", "Length (in)": "18" },
        ],
        measurementNotes: "4-way high stretch performance blend. Fits true to size.",
        isActive: true,
      },
      {
        name: "Women's Leggings & Shorts",
        category: "Women",
        clothingType: "Bottoms",
        unit: "in",
        columns: ["Size", "Waist (in)", "Hip (in)", "Inseam (in)"],
        rows: [
          { "Size": "XS", "Waist (in)": "24 - 26", "Hip (in)": "34 - 36", "Inseam (in)": "25" },
          { "Size": "S", "Waist (in)": "26 - 28", "Hip (in)": "36 - 38", "Inseam (in)": "25" },
          { "Size": "M", "Waist (in)": "28 - 30", "Hip (in)": "38 - 40", "Inseam (in)": "25.5" },
          { "Size": "L", "Waist (in)": "30 - 33", "Hip (in)": "40 - 43", "Inseam (in)": "26" },
          { "Size": "XL", "Waist (in)": "33 - 36", "Hip (in)": "43 - 46", "Inseam (in)": "26" },
        ],
        measurementNotes: "High-waisted compression fit with squat-proof stretch.",
        isActive: true,
      },
    ];
    await SizeGuide.insertMany(defaults);
    logger.info("[sizeGuideController] Default size guides seeded successfully.");
  }
};

// GET /api/v1/store/size-guides (public)
export const getSizeGuides = async (req, res) => {
  try {
    await seedDefaultSizeGuides();
    const sizeGuides = await SizeGuide.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json({ ok: true, sizeGuides });
  } catch (err) {
    logger.error("[sizeGuideController] getSizeGuides error:", { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
};

// GET /api/v1/store/size-guides/:id (public)
export const getSizeGuideById = async (req, res) => {
  try {
    const sizeGuide = await SizeGuide.findById(req.params.id).lean();
    if (!sizeGuide) {
      return res.status(404).json({ ok: false, error: "Size guide not found" });
    }
    res.json({ ok: true, sizeGuide });
  } catch (err) {
    logger.error("[sizeGuideController] getSizeGuideById error:", { error: err.message });
    res.status(400).json({ ok: false, error: err.message });
  }
};

// GET /api/v1/admin/size-guides (admin)
export const getAllSizeGuidesAdmin = async (req, res) => {
  try {
    await seedDefaultSizeGuides();
    const sizeGuides = await SizeGuide.find().sort({ createdAt: -1 }).lean();

    const withCount = await Promise.all(
      sizeGuides.map(async (guide) => {
        const productCount = await Product.countDocuments({ sizeGuide: guide._id });
        return { ...guide, productCount };
      })
    );

    res.json({ ok: true, sizeGuides: withCount });
  } catch (err) {
    logger.error("[sizeGuideController] getAllSizeGuidesAdmin error:", { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
};

// POST /api/v1/admin/size-guides (admin)
export const createSizeGuide = async (req, res) => {
  try {
    const { name, category, clothingType, columns, rows, unit, measurementNotes, measureGuideImage, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ ok: false, error: "Size guide name is required" });
    }

    const sizeGuide = await SizeGuide.create({
      name: name.trim(),
      category: category?.trim() || "",
      clothingType: clothingType?.trim() || "",
      columns: Array.isArray(columns) && columns.length > 0 ? columns : ["Size", "Chest (in)", "Length (in)"],
      rows: Array.isArray(rows) ? rows : [],
      unit: unit || "in",
      measurementNotes: measurementNotes?.trim() || "",
      measureGuideImage: measureGuideImage?.trim() || "",
      isActive: isActive !== undefined ? !!isActive : true,
    });

    res.status(201).json({ ok: true, sizeGuide });
  } catch (err) {
    logger.error("[sizeGuideController] createSizeGuide error:", { error: err.message });
    res.status(400).json({ ok: false, error: err.message });
  }
};

// PUT /api/v1/admin/size-guides/:id (admin)
export const updateSizeGuide = async (req, res) => {
  const { id } = req.params;
  try {
    const sizeGuide = await SizeGuide.findById(id);
    if (!sizeGuide) {
      return res.status(404).json({ ok: false, error: "Size guide not found" });
    }

    const { name, category, clothingType, columns, rows, unit, measurementNotes, measureGuideImage, isActive } = req.body;

    if (name && name.trim()) sizeGuide.name = name.trim();
    if (category !== undefined) sizeGuide.category = category.trim();
    if (clothingType !== undefined) sizeGuide.clothingType = clothingType.trim();
    if (Array.isArray(columns)) sizeGuide.columns = columns;
    if (Array.isArray(rows)) sizeGuide.rows = rows;
    if (unit !== undefined) sizeGuide.unit = unit;
    if (measurementNotes !== undefined) sizeGuide.measurementNotes = measurementNotes.trim();
    if (measureGuideImage !== undefined) sizeGuide.measureGuideImage = measureGuideImage.trim();
    if (isActive !== undefined) sizeGuide.isActive = !!isActive;

    await sizeGuide.save();
    res.json({ ok: true, sizeGuide });
  } catch (err) {
    logger.error("[sizeGuideController] updateSizeGuide error:", { error: err.message });
    res.status(400).json({ ok: false, error: err.message });
  }
};

// DELETE /api/v1/admin/size-guides/:id (admin)
export const deleteSizeGuide = async (req, res) => {
  const { id } = req.params;
  try {
    const sizeGuide = await SizeGuide.findById(id);
    if (!sizeGuide) {
      return res.status(404).json({ ok: false, error: "Size guide not found" });
    }

    // Unlink any products currently pointing to this size guide
    await Product.updateMany({ sizeGuide: id }, { $set: { sizeGuide: null } });

    await SizeGuide.findByIdAndDelete(id);
    res.json({ ok: true, message: "Size guide deleted successfully" });
  } catch (err) {
    logger.error("[sizeGuideController] deleteSizeGuide error:", { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
};
