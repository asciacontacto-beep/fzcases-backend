import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { Product, SheetRow, Variant } from "../types/product";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface Cache {
  data: Product[] | null;
  lastFetch: number;
}

const cache: Cache = { data: null, lastFetch: 0 };

function parseBooleanCell(value?: string): boolean {
  return value?.trim().toUpperCase() === "TRUE";
}

export async function getProducts(forceRefresh = false): Promise<Product[]> {
  const now = Date.now();
  if (!forceRefresh && cache.data !== null && now - cache.lastFetch < CACHE_TTL_MS) {
    console.log("[Cache] Returning cached products.");
    return cache.data!;
  }

  console.log("[Sheets] Fetching fresh data...");

  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY!;
  const privateKey = rawKey.replace(/\\n/g, "\n").replace(/^"+|"+$/g, "").trim();
  const sheetId = process.env.GOOGLE_SHEET_ID!;

  const auth = new JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const doc = new GoogleSpreadsheet(sheetId, auth);
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  const rows = await sheet.getRows<SheetRow>();

  const productMap = new Map<string, { base: SheetRow; variants: Variant[] }>();

  for (const row of rows) {
    const r = row.toObject() as SheetRow;

    if (!parseBooleanCell(r.Activo)) continue;
    if (!r.ID_Modelo || !r.Nombre || !r.Categoria || !r.Almacenamiento || !r.Condicion) continue;

    const productId = r.ID_Modelo.toLowerCase();

   const condicionMap: Record<string, "sealed" | "semi-new" | "used-excellent" | "used-very-good"> = {
  "sellado": "sealed",
  "semi nuevo": "semi-new",
  "usado excelente": "used-excellent",
  "usado muy bueno": "used-very-good",
  // También acepta los valores en inglés por si acaso
  "sealed": "sealed",
  "semi-new": "semi-new",
  "used-excellent": "used-excellent",
  "used-very-good": "used-very-good",
};

const condicion = condicionMap[r.Condicion.toLowerCase().trim()];
if (!condicion) continue; // si el valor no es válido, ignora la fila

const variant: Variant = {
  condition: condicion,
  storage: r.Almacenamiento,
};


    if (!productMap.has(productId)) {
      productMap.set(productId, { base: r, variants: [] });
    }
    productMap.get(productId)!.variants.push(variant);
  }

  const products: Product[] = [];

  for (const [productId, { base, variants }] of productMap) {
    products.push({
      id: productId,
      name: base.Nombre,
      category: base.Categoria as "iphone" | "macbook" | "airpods" | "accesorios",
      variants,
      ...(base.Imagen ? { image: base.Imagen } : {}),
      ...(parseBooleanCell(base.Destacado) ? { featured: true } : {}),
    });
  }

  products.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });

  cache.data = products;
  cache.lastFetch = Date.now();
  console.log(`[Sheets] Loaded ${products.length} products.`);
  return products;
}

export function invalidateCache(): void {
  cache.data = null;
  cache.lastFetch = 0;
}
