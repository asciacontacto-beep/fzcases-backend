import { Router, Request, Response } from "express";
import { getProducts, invalidateCache } from "../services/googleSheets";

const router = Router();

// GET /products
router.get("/", async (req: Request, res: Response) => {
  try {
    const products = await getProducts();

    let result = products;

    if (req.query.category) {
      result = result.filter((p) => p.category === req.query.category);
    }

    if (req.query.featured === "true") {
      result = result.filter((p) => p.featured === true);
    }

    res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    console.error("[GET /products] Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
});

// GET /products/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const products = await getProducts();
    const product = products.find((p) => p.id === req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error("[GET /products/:id] Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch product" });
  }
});

// POST /products/refresh
router.post("/refresh", async (req: Request, res: Response) => {
  const secret = req.headers["x-refresh-secret"];
  if (secret !== process.env.REFRESH_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    invalidateCache();
    const products = await getProducts(true);
    res.json({ success: true, message: "Cache refreshed", count: products.length });
  } catch (error) {
    console.error("[POST /products/refresh] Error:", error);
    res.status(500).json({ success: false, error: "Failed to refresh cache" });
  }
});

export default router;
