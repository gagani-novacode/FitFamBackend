import Category from "../models/Category.model.js";
import Product from "../models/Product.model.js";
import logger from "../utils/logger.js";

const toSlug = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

// Seed initial default categories if empty
const seedDefaultCategories = async () => {
  const count = await Category.countDocuments();
  if (count === 0) {
    logger.info("[categoryController] Seeding initial default categories...");
    const defaults = [
      {
        name: "Men",
        slug: "men",
        clothingTypes: ["Tops", "Bottoms"],
        subcategories: [
          { name: "Oversize", slug: "oversize", order: 1 },
          { name: "Polo", slug: "polo", order: 2 },
          { name: "Compression", slug: "compression", order: 3 },
          { name: "Tanks & Stringers", slug: "tanks-stringers", order: 4 },
          { name: "Shorts", slug: "shorts", order: 5 },
          { name: "Pants", slug: "pants", order: 6 },
        ],
        order: 1,
        isActive: true,
      },
      {
        name: "Women",
        slug: "women",
        clothingTypes: ["Tops", "Bottoms"],
        subcategories: [
          { name: "Oversize", slug: "oversize", order: 1 },
          { name: "Crop Tops", slug: "crop-tops", order: 2 },
          { name: "Shorts", slug: "shorts", order: 3 },
          { name: "Leggings", slug: "leggings", order: 4 },
          { name: "Tops & Short Set", slug: "tops-short-set", order: 5 },
        ],
        order: 2,
        isActive: true,
      },
      {
        name: "Accessories",
        slug: "accessories",
        clothingTypes: [],
        subcategories: [],
        order: 3,
        isActive: true,
      },
    ];
    await Category.insertMany(defaults);
    logger.info("[categoryController] Default categories seeded successfully.");
  }
};

// GET /api/v1/store/categories (public)
export const getCategories = async (req, res) => {
  try {
    await seedDefaultCategories();
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    res.json({ ok: true, categories });
  } catch (err) {
    logger.error("[categoryController] getCategories error:", { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
};

// GET /api/v1/admin/categories (admin)
export const getAllCategoriesAdmin = async (req, res) => {
  try {
    await seedDefaultCategories();
    const categories = await Category.find().sort({ order: 1, createdAt: 1 }).lean();

    // Attach count of products for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({ category: cat.name });
        return { ...cat, productCount };
      })
    );

    res.json({ ok: true, categories: categoriesWithCount });
  } catch (err) {
    logger.error("[categoryController] getAllCategoriesAdmin error:", { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
};

// POST /api/v1/admin/categories (admin)
export const createCategory = async (req, res) => {
  try {
    const { name, slug, description, clothingTypes, subcategories, order, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ ok: false, error: "Category name is required" });
    }

    const generatedSlug = (slug && slug.trim()) ? toSlug(slug) : toSlug(name);

    const existing = await Category.findOne({
      $or: [{ name: name.trim() }, { slug: generatedSlug }],
    });
    if (existing) {
      return res.status(400).json({ ok: false, error: "Category with this name or slug already exists" });
    }

    const formattedSubcategories = Array.isArray(subcategories)
      ? subcategories
          .filter((s) => s && s.name && s.name.trim())
          .map((s, idx) => ({
            name: s.name.trim(),
            slug: s.slug ? toSlug(s.slug) : toSlug(s.name),
            order: s.order !== undefined ? Number(s.order) : idx + 1,
          }))
      : [];

    const category = await Category.create({
      name: name.trim(),
      slug: generatedSlug,
      description: description?.trim() || "",
      clothingTypes: Array.isArray(clothingTypes) ? clothingTypes : ["Tops", "Bottoms"],
      subcategories: formattedSubcategories,
      order: order !== undefined ? Number(order) : 0,
      isActive: isActive !== undefined ? !!isActive : true,
    });

    res.status(201).json({ ok: true, category });
  } catch (err) {
    logger.error("[categoryController] createCategory error:", { error: err.message });
    res.status(400).json({ ok: false, error: err.message });
  }
};

// PUT /api/v1/admin/categories/:id (admin)
export const updateCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ ok: false, error: "Category not found" });
    }

    const { name, slug, description, clothingTypes, order, isActive } = req.body;
    const oldName = category.name;

    if (name && name.trim()) {
      category.name = name.trim();
    }
    if (slug && slug.trim()) {
      category.slug = toSlug(slug);
    }
    if (description !== undefined) {
      category.description = description.trim();
    }
    if (Array.isArray(clothingTypes)) {
      category.clothingTypes = clothingTypes;
    }
    if (order !== undefined) {
      category.order = Number(order);
    }
    if (isActive !== undefined) {
      category.isActive = !!isActive;
    }

    await category.save();

    // If category name changed, update corresponding products so they remain connected
    if (name && name.trim() !== oldName) {
      await Product.updateMany({ category: oldName }, { category: name.trim() });
    }

    res.json({ ok: true, category });
  } catch (err) {
    logger.error("[categoryController] updateCategory error:", { error: err.message });
    res.status(400).json({ ok: false, error: err.message });
  }
};

// DELETE /api/v1/admin/categories/:id (admin)
export const deleteCategory = async (req, res) => {
  const { id } = req.params;
  const { force } = req.query;
  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ ok: false, error: "Category not found" });
    }

    const productCount = await Product.countDocuments({ category: category.name });
    if (productCount > 0 && force !== "true") {
      return res.status(400).json({
        ok: false,
        error: `Cannot delete category: ${productCount} product(s) are currently categorized under "${category.name}". Please reassign them first or confirm force deletion.`,
        productCount,
      });
    }

    await Category.findByIdAndDelete(id);
    res.json({ ok: true, message: "Category deleted successfully" });
  } catch (err) {
    logger.error("[categoryController] deleteCategory error:", { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
};

// POST /api/v1/admin/categories/:id/subcategories (admin)
export const addSubcategory = async (req, res) => {
  const { id } = req.params;
  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ ok: false, error: "Category not found" });
    }

    const { name, slug } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ ok: false, error: "Subcategory name is required" });
    }

    const subName = name.trim();
    const subSlug = slug && slug.trim() ? toSlug(slug) : toSlug(subName);

    const exists = category.subcategories.some(
      (s) => s.name.toLowerCase() === subName.toLowerCase() || s.slug === subSlug
    );
    if (exists) {
      return res.status(400).json({ ok: false, error: "Subcategory already exists in this category" });
    }

    const newSub = {
      name: subName,
      slug: subSlug,
      order: category.subcategories.length + 1,
    };
    category.subcategories.push(newSub);
    await category.save();

    res.status(201).json({ ok: true, category, subcategory: newSub });
  } catch (err) {
    logger.error("[categoryController] addSubcategory error:", { error: err.message });
    res.status(400).json({ ok: false, error: err.message });
  }
};

// DELETE /api/v1/admin/categories/:id/subcategories/:subId (admin)
export const deleteSubcategory = async (req, res) => {
  const { id, subId } = req.params;
  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ ok: false, error: "Category not found" });
    }

    const sub = category.subcategories.id(subId);
    if (!sub) {
      return res.status(404).json({ ok: false, error: "Subcategory not found" });
    }

    category.subcategories.pull(subId);
    await category.save();

    res.json({ ok: true, category });
  } catch (err) {
    logger.error("[categoryController] deleteSubcategory error:", { error: err.message });
    res.status(400).json({ ok: false, error: err.message });
  }
};
