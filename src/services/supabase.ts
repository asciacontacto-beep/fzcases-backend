import dotenv from "dotenv";
dotenv.config();
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VariantRow {
  id: string;
  product_id: string;
  condition: string;
  storage?: string;
  price?: number;
  color?: string;
  active: boolean;
  variant_images?: { id: string; image_url: string }[];
}

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  image_url?: string;
  featured: boolean;
  active: boolean;
  created_at: string;
  variants?: VariantRow[];
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAllProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(`*, variants(*, variant_images(*))`)
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("name");

  if (error) throw error;
  return data as ProductRow[];
}

export async function getProductById(id: string) {
  const { data, error } = await supabase
    .from("products")
    .select(`*, variants(*, variant_images(*))`)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as ProductRow;
}

export async function createProduct(product: Omit<ProductRow, "created_at" | "variants">) {
  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data as ProductRow;
}

export async function updateProduct(id: string, updates: Partial<ProductRow>) {
  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ProductRow;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function createVariant(variant: Omit<VariantRow, "id">) {
  const { data, error } = await supabase
    .from("variants")
    .insert(variant)
    .select()
    .single();

  if (error) throw error;
  return data as VariantRow;
}

export async function updateVariant(id: string, updates: Partial<VariantRow>) {
  const { data, error } = await supabase
    .from("variants")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as VariantRow;
}

export async function deleteVariant(id: string) {
  const { error } = await supabase
    .from("variants")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ─── Image Upload ─────────────────────────────────────────────────────────────

export async function uploadProductImage(productId: string, file: Buffer, mimeType: string): Promise<string> {
  const ext = mimeType.split("/")[1];
  const path = `products/${productId}.${ext}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: mimeType, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function getVariantImages(variantId: string) {
  const { data, error } = await supabase
    .from("variant_images")
    .select("*")
    .eq("variant_id", variantId);

  if (error) throw error;
  return data;
}

export async function uploadVariantImage(variantId: string, file: Buffer, mimeType: string): Promise<string> {
  const ext = mimeType.split("/")[1];
  const path = `variants/${variantId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: mimeType, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(path);

  const { error: dbError } = await supabase
    .from("variant_images")
    .insert({ variant_id: variantId, image_url: data.publicUrl });

  if (dbError) throw dbError;

  return data.publicUrl;
}

export async function deleteVariantImage(imageId: string) {
  const { error } = await supabase
    .from("variant_images")
    .delete()
    .eq("id", imageId);

  if (error) throw error;
}