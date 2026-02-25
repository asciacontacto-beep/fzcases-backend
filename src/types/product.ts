export type Condition = "sealed" | "semi-new" | "used-excellent" | "used-very-good";
export type CategorySlug = "iphone" | "macbook" | "airpods" | "accesorios";

export interface Variant {
  condition: Condition;
  storage: string;
}

export interface Product {
  id: string;
  name: string;
  category: CategorySlug;
  image?: string;
  variants: Variant[];
  featured?: boolean;
}

export interface SheetRow {
  ID_Modelo: string;
  Nombre: string;
  Categoria: string;
  Almacenamiento: string;
  Condicion: string;
  Imagen?: string;
  Destacado?: string;
  Activo: string;
}
