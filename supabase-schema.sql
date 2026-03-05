-- =============================================
-- URBANCROWN — Schema de Supabase
-- Ejecutar en el SQL Editor de Supabase
-- =============================================

-- TABLA: Categorías
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  emoji TEXT DEFAULT '👑',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA: Productos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category_slug TEXT NOT NULL REFERENCES categories(slug) ON UPDATE CASCADE,
  emoji TEXT DEFAULT '👑',
  price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  badge TEXT DEFAULT '' CHECK (badge IN ('', 'new', 'hot')),
  active BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categorías públicas" ON categories
  FOR SELECT USING (TRUE);

CREATE POLICY "Productos activos públicos" ON products
  FOR SELECT USING (active = TRUE);

CREATE POLICY "Admin puede todo en categorías" ON categories
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admin puede todo en productos" ON products
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- DATOS INICIALES
-- =============================================

INSERT INTO categories (name, slug, emoji) VALUES
  ('Ropa', 'ropa', '👔'),
  ('Fragancias', 'fragancias', '🌹'),
  ('Accesorios', 'accesorios', '💼'),
  ('Calzado', 'calzado', '👟')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (name, description, category_slug, emoji, price, stock, badge) VALUES
  ('Camiseta GG Supreme', 'Algodón pima, logo bordado', 'ropa', '👕', 89990, 8, 'new'),
  ('Polo Gucci Signature', 'Tejido de lujo, slim fit', 'ropa', '🧥', 119990, 4, 'hot'),
  ('Guilty Pour Homme', 'Eau de Toilette 90ml', 'fragancias', '🌹', 149990, 6, 'new'),
  ('Bloom Nettare di Fiori', 'Eau de Parfum 100ml', 'fragancias', '💐', 169990, 3, ''),
  ('Bolso Ophidia GG', 'Cuero supremo, monograma', 'accesorios', '👜', 349990, 2, 'hot'),
  ('Cinturón GG Buckle', 'Cuero italiano, hebilla dorada', 'accesorios', '🔱', 129990, 5, ''),
  ('Sneakers Ace Embroidered', 'Cuero blanco, bordado floral', 'calzado', '👟', 289990, 3, 'new'),
  ('Loafers Horsebit', 'Mocasines clásicos Gucci', 'calzado', '🥿', 259990, 4, '');
