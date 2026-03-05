# 👑 UrbanCrown — Catálogo Online

Catálogo de ropa Gucci con carrito, WhatsApp checkout, panel admin y Supabase en tiempo real.

---

## 🚀 Setup en 5 pasos

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Supabase
1. Crea una cuenta en [supabase.com](https://supabase.com)
2. Nuevo proyecto → copia `URL` y `anon key`
3. Ve a **SQL Editor** → pega el contenido de `supabase-schema.sql` → **Run**
4. En **Realtime** → habilita la tabla `products`

### 3. Configurar Cloudinary (para fotos de productos)
1. Cuenta en [cloudinary.com](https://cloudinary.com)
2. Settings → Upload → **Add upload preset** → Unsigned → nombre: `urbancrown_unsigned`
3. Copia tu `cloud name`

### 4. Completar `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=urbancrown_unsigned
NEXT_PUBLIC_ADMIN_PASSWORD=urbancrown2026
ADMIN_PASSWORD=urbancrown2026
NEXT_PUBLIC_WA_NUMBER=56912345678   ← tu número real
```

### 5. Correr el proyecto
```bash
npm run dev
```

---

## 📁 Estructura
```
urbancrown/
├── app/
│   ├── page.tsx              ← Catálogo público
│   ├── admin/page.tsx        ← Panel admin (/admin)
│   ├── api/products/         ← API REST
│   └── globals.css           ← Paleta Gucci completa
├── components/
│   ├── catalog/CatalogClient.tsx   ← Tienda con carrito
│   └── admin/AdminPanel.tsx        ← Panel con realtime
├── lib/
│   ├── supabase.ts           ← Cliente Supabase
│   └── cloudinary.ts         ← Upload de imágenes
├── types/index.ts            ← Tipos TypeScript
├── supabase-schema.sql       ← Schema + datos iniciales
└── .env.local                ← Variables de entorno
```

---

## 🛍 Funcionalidades
- ✅ Catálogo en tiempo real (Supabase Realtime)
- ✅ Carrito con cantidades y stock
- ✅ Checkout por WhatsApp automático
- ✅ Filtros por categoría
- ✅ Panel admin protegido por contraseña
- ✅ Subida de fotos a Cloudinary
- ✅ Edición de stock en vivo
- ✅ Badges (Nuevo / Popular)
- ✅ Responsive mobile

## 🌐 Deploy en Vercel
1. Sube el proyecto a GitHub
2. Importa en [vercel.com](https://vercel.com)
3. Agrega las variables de `.env.local` en Vercel → Settings → Environment Variables
4. Deploy ✓

---

## 🎨 Paleta de colores
| Color | Hex |
|-------|-----|
| Rojo Gucci | `#8B1A1A` |
| Carmesí | `#9B2335` |
| Verde Gucci | `#1E3D2F` |
| Verde oscuro | `#0D3D38` |
| Negro | `#000000` |
| Crema | `#F7F2EC` |
