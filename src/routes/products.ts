import {
  // ... los que ya tenés
  getVariantImages,
  uploadVariantImage,
  deleteVariantImage,
} from "../services/supabase";
import { Router, Request, Response } from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createVariant,
  updateVariant,
  deleteVariant,
  uploadProductImage,
  ProductRow,
} from "../services/supabase";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatProduct(p: ProductRow) {
  const variants = (p.variants || []).filter(v => v.active);
  const prices = variants.map(v => v.price).filter(Boolean) as number[];

  return {
    id: p.id,
    name: p.name,
    category: p.category,
    image: p.image_url,
    featured: p.featured,
    variants: variants.map(v => ({
      id: v.id,
      condition: v.condition,
      storage: v.storage,
      price: v.price,
      color: v.color,
    })),
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    storageOptions: [...new Set(variants.map(v => v.storage).filter(Boolean))],
    colors: [...new Set(variants.map(v => v.color).filter(Boolean))],
  };
}

// ─── Public Routes ────────────────────────────────────────────────────────────

// GET /products
router.get("/", async (req: Request, res: Response) => {
  try {
    const products = await getAllProducts();
    let result = products.map(formatProduct);

    if (req.query.category) {
      result = result.filter(p => p.category === req.query.category);
    }
    if (req.query.featured === "true") {
      result = result.filter(p => p.featured);
    }

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
});

// GET /products/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const product = await getProductById(req.params.id);
    res.json({ success: true, data: formatProduct(product) });
  } catch (error) {
    res.status(404).json({ success: false, error: "Product not found" });
  }
});

// ─── Admin Routes (protected by middleware in server.ts) ──────────────────────

// POST /products
router.post("/", async (req: Request, res: Response) => {
  try {
    const { variants, ...productData } = req.body;
    const product = await createProduct(productData);

    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        await createVariant({ ...v, product_id: product.id, active: true });
      }
    }

    const full = await getProductById(product.id);
    res.status(201).json({ success: true, data: formatProduct(full) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to create product" });
  }
});

// PUT /products/:id
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { variants, ...productData } = req.body;
    await updateProduct(req.params.id, productData);
    const full = await getProductById(req.params.id);
    res.json({ success: true, data: formatProduct(full) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update product" });
  }
});

// DELETE /products/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await deleteProduct(req.params.id);
    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete product" });
  }
});

// POST /products/:id/image
router.post("/:id/image", upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No image provided" });

    const url = await uploadProductImage(req.params.id, req.file.buffer, req.file.mimetype);
    await updateProduct(req.params.id, { image_url: url });

    res.json({ success: true, url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to upload image" });
  }
});

// POST /products/:id/variants
router.post("/:id/variants", async (req: Request, res: Response) => {
  try {
    const variant = await createVariant({ ...req.body, product_id: req.params.id, active: true });
    res.status(201).json({ success: true, data: variant });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to create variant" });
  }
});

// PUT /products/:id/variants/:variantId
router.put("/:id/variants/:variantId", async (req: Request, res: Response) => {
  try {
    const variant = await updateVariant(req.params.variantId, req.body);
    res.json({ success: true, data: variant });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update variant" });
  }
});

// DELETE /products/:id/variants/:variantId
router.delete("/:id/variants/:variantId", async (req: Request, res: Response) => {
  try {
    await deleteVariant(req.params.variantId);
    res.json({ success: true, message: "Variant deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete variant" });
  }
});

// GET /products/:id/variants/:variantId/images
router.get("/:id/variants/:variantId/images", async (req: Request, res: Response) => {
  try {
    const images = await getVariantImages(req.params.variantId);
    res.json({ success: true, data: images });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch images" });
  }
});

// POST /products/:id/variants/:variantId/images
router.post("/:id/variants/:variantId/images", upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No image provided" });
    const url = await uploadVariantImage(req.params.variantId, req.file.buffer, req.file.mimetype);
    res.json({ success: true, url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to upload image" });
  }
});

// DELETE /products/:id/variants/:variantId/images/:imageId
router.delete("/:id/variants/:variantId/images/:imageId", async (req: Request, res: Response) => {
  try {
    await deleteVariantImage(req.params.imageId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete image" });
  }
});

export default router;
