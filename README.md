# 🍎 Apple Reseller Backend

API REST con Node.js + TypeScript + Express que usa **Google Sheets como base de datos/CMS** para gestionar el stock y precios.

---

## 📁 Estructura de Carpetas

```
apple-reseller-backend/
├── src/
│   ├── server.ts               # Entry point — Express app
│   ├── routes/
│   │   └── products.ts         # GET /products, GET /products/:id, POST /products/refresh
│   ├── services/
│   │   └── googleSheets.ts     # Lógica de Sheets + caché + agrupamiento
│   └── types/
│       └── product.ts          # Interfaces TypeScript (100% compatibles con tu frontend)
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 🔑 Guía: Crear Service Account en Google Cloud

### Paso 1 — Crear Proyecto en Google Cloud
1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Click en el selector de proyectos (arriba a la izquierda) → **"Nuevo proyecto"**
3. Nombre: `apple-reseller` → **Crear**

### Paso 2 — Habilitar la API de Google Sheets
1. En el menú lateral: **APIs y servicios** → **Biblioteca**
2. Buscar `Google Sheets API` → Click → **Habilitar**

### Paso 3 — Crear la Service Account
1. **APIs y servicios** → **Credenciales** → **Crear credenciales** → **Cuenta de servicio**
2. Nombre: `sheets-reader` → **Crear y continuar**
3. Rol: **Lector básico** (o dejar vacío) → **Listo**

### Paso 4 — Obtener el JSON de credenciales
1. En la lista de cuentas de servicio, click en la que acabas de crear
2. Pestaña **Claves** → **Agregar clave** → **Crear clave nueva** → **JSON** → **Crear**
3. Se descargará un archivo `.json`. **Guárdalo en un lugar seguro, nunca lo subas a Git.**
4. Del JSON, necesitas dos valores para tu `.env`:
   - `client_email` → es tu `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → es tu `GOOGLE_PRIVATE_KEY`

### Paso 5 — Compartir la planilla con la Service Account
1. Abre tu Google Sheet
2. Click en **Compartir** (arriba a la derecha)
3. Pega el `client_email` de tu Service Account (ej: `sheets-reader@apple-reseller.iam.gserviceaccount.com`)
4. Permiso: **Lector** → **Enviar**

### Paso 6 — Obtener el Sheet ID
La URL de tu planilla tiene este formato:
```
https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
```
Copia ese ID y ponlo en `GOOGLE_SHEET_ID` de tu `.env`.

---

## 📊 Estructura de la Planilla de Google

La **primera hoja** del documento debe tener exactamente estas columnas (la primera fila es el encabezado):

| Columna | Descripción | Valores válidos | Ejemplo |
|---|---|---|---|
| `ID_Modelo` | Slug único del modelo | Solo letras, números y guiones | `iphone-13` |
| `Nombre` | Nombre completo del producto | Texto libre | `iPhone 13` |
| `Categoria` | Categoría | `iphone`, `macbook`, `airpods`, `accesorios` | `iphone` |
| `Almacenamiento` | Capacidad de almacenamiento | Texto libre | `128GB` |
| `Condicion` | Estado del equipo | `sealed`, `semi-new`, `used-excellent`, `used-very-good` | `used-excellent` |
| `Precio` | Precio de venta en tu moneda | Número sin símbolos | `750000` |
| `Bateria` | Salud de batería (opcional) | Porcentaje con `%` | `89%` |
| `Color_Nombre` | Nombre del color (opcional) | Texto libre | `Midnight` |
| `Color_Hex` | Código hex del color (opcional) | Hex con `#` | `#1C1C1E` |
| `Imagen` | URL de imagen (opcional) | URL válida | `https://...` |
| `Destacado` | ¿Aparece en sección destacada? | `TRUE` o `FALSE` | `TRUE` |
| `Specs_Label` | Labels de especificaciones (pipe-separated) | Texto separado por `\|` | `Chip\|Pantalla\|Cámara` |
| `Specs_Value` | Valores de especificaciones (pipe-separated) | Texto separado por `\|` | `A15 Bionic\|6.1" OLED\|12MP` |
| `Activo` | ¿Mostrar en la tienda? | `TRUE` o `FALSE` | `TRUE` |

### Ejemplo de filas (un iPhone 13 con 2 variantes de condición):

```
ID_Modelo  | Nombre    | Categoria | Almacenamiento | Condicion     | Precio  | Bateria | Activo
iphone-13  | iPhone 13 | iphone    | 128GB          | sealed        | 950000  |         | TRUE
iphone-13  | iPhone 13 | iphone    | 128GB          | used-excellent| 720000  | 91%     | TRUE
iphone-13  | iPhone 13 | iphone    | 256GB          | sealed        | 1100000 |         | TRUE
```

Estas 3 filas generarán **2 objetos Product**: uno para `iphone-13-128gb` (con 2 variantes) y otro para `iphone-13-256gb`.

---

## 🚀 Instalación y Ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de entorno
cp .env.example .env
# Editar .env con tus credenciales reales

# 3. Modo desarrollo (hot reload)
npm run dev

# 4. Producción
npm run build
npm start
```

---

## 📡 Endpoints

### `GET /products`
Devuelve todos los productos activos agrupados.

```bash
# Todos los productos
curl http://localhost:3001/products

# Filtrar por categoría
curl http://localhost:3001/products?category=iphone

# Solo destacados
curl http://localhost:3001/products?featured=true
```

**Respuesta:**
```json
{
  "success": true,
  "count": 12,
  "data": [
    {
      "id": "iphone-13-128gb",
      "name": "iPhone 13",
      "category": "iphone",
      "storage": "128GB",
      "variants": [
        { "condition": "sealed", "price": 950000 },
        { "condition": "used-excellent", "price": 720000, "battery": "91%" }
      ],
      "priceMin": 720000,
      "priceMax": 950000,
      "featured": true
    }
  ]
}
```

### `GET /products/:id`
Devuelve un producto por su ID.

```bash
curl http://localhost:3001/products/iphone-13-128gb
```

### `POST /products/refresh`
Invalida el caché y fuerza re-fetch desde Google Sheets.

```bash
curl -X POST http://localhost:3001/products/refresh \
  -H "x-refresh-secret: tu-secreto-aqui"
```

---

## 🔌 Integración con Next.js

En tu frontend Next.js, crea un archivo `lib/api.ts`:

```typescript
import { Product } from "@/types/product"; // tus tipos actuales

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function getProducts(category?: string): Promise<Product[]> {
  const url = new URL(`${API_URL}/products`);
  if (category) url.searchParams.set("category", category);

  const res = await fetch(url.toString(), {
    next: { revalidate: 300 }, // ISR: revalidar cada 5 minutos
  });

  if (!res.ok) throw new Error("Failed to fetch products");

  const json = await res.json();
  return json.data as Product[];
}

export async function getProduct(id: string): Promise<Product | null> {
  const res = await fetch(`${API_URL}/products/${id}`, {
    next: { revalidate: 300 },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch product");

  const json = await res.json();
  return json.data as Product;
}
```

---

## ⚙️ Variables de Entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | ✅ | Email de la Service Account |
| `GOOGLE_PRIVATE_KEY` | ✅ | Private key del JSON (con `\n` escapados) |
| `GOOGLE_SHEET_ID` | ✅ | ID de la planilla de Google |
| `PORT` | ❌ | Puerto del servidor (default: `3001`) |
| `CORS_ORIGIN` | ❌ | URL del frontend (default: `http://localhost:3000`) |
| `REFRESH_SECRET` | ❌ | Secreto para el endpoint de refresh de caché |

---

## 💡 Tips de Producción

- **Deploy en Railway / Render / Fly.io**: Sube las variables de entorno desde el dashboard, NO subas `.env` a Git.
- **Agrega `.env` a `.gitignore`** siempre.
- **El caché es de 5 minutos** por defecto. Puedes cambiarlo editando `CACHE_TTL_MS` en `googleSheets.ts`.
- **Webhook de refresco**: Si editas la planilla y quieres ver los cambios al instante, llama al endpoint `POST /products/refresh`.
