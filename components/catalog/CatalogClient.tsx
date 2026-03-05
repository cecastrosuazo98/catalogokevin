'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Category, CartItem, formatCLP } from '@/types';

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || '56912345678';

// SVG corona UrbanCrown
function CrownSVG({ size = 80, shadow = false }: { size?: number; shadow?: boolean }) {
  return (
    <svg width={size} viewBox="0 0 160 110" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={shadow ? { filter: 'drop-shadow(0 4px 16px rgba(139,26,26,0.25))' } : {}}>
      <defs>
        <linearGradient id="crownGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5D060" />
          <stop offset="45%" stopColor="#C8961A" />
          <stop offset="100%" stopColor="#8B6410" />
        </linearGradient>
      </defs>
      <rect x="12" y="76" width="136" height="22" rx="4" fill="url(#crownGold)" />
      <polygon points="26,76 14,24 46,50" fill="url(#crownGold)" />
      <polygon points="56,76 38,10 72,44" fill="url(#crownGold)" />
      <polygon points="80,76 70,4 90,4 80,76" fill="url(#crownGold)" />
      <polygon points="104,76 88,44 122,10" fill="url(#crownGold)" />
      <polygon points="134,76 114,50 146,24" fill="url(#crownGold)" />
      <circle cx="80" cy="87" r="7" fill="#0d0d0d" stroke="#C8961A" strokeWidth="1.5" />
      <circle cx="34" cy="87" r="4" fill="#0d0d0d" stroke="#C8961A" strokeWidth="1" />
      <circle cx="126" cy="87" r="4" fill="#0d0d0d" stroke="#C8961A" strokeWidth="1" />
      <line x1="80" y1="6" x2="77" y2="20" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
      <line x1="56" y1="14" x2="54" y2="26" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="104" y1="14" x2="106" y2="26" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  products: Product[];
  categories: Category[];
}

export default function CatalogClient({ products: initialProducts, categories }: Props) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [products, setProducts] = useState<Product[]>(initialProducts);

  useEffect(() => {
    const channel = supabase
      .channel('catalog-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setProducts(prev => prev.map(p => p.id === (payload.new as Product).id ? { ...p, ...(payload.new as Product) } : p));
        } else if (payload.eventType === 'INSERT') {
          setProducts(prev => [payload.new as Product, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setProducts(prev => prev.filter(p => p.id !== (payload.old as Product).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    const visible = products.filter(p => p.stock > 0 && p.active);
    return activeFilter === 'all' ? visible : visible.filter(p => p.category_slug === activeFilter);
  }, [products, activeFilter]);

  function addToCart(product: Product) {
    if (product.stock === 0) return;
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) {
        if (exists.quantity >= product.stock) { showToast(`⚠️ Solo hay ${product.stock} disponibles`); return prev; }
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast(`✓ ${product.name} agregado`);
  }

  function updateQty(id: string, delta: number) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, Math.min(i.quantity + delta, i.stock)) } : i).filter(i => i.quantity > 0));
  }

  function removeFromCart(id: string) { setCart(prev => prev.filter(i => i.id !== id)); }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function waProduct(p: Product) {
    const msg = encodeURIComponent(`Hola UrbanCrown! 👑 Me interesa *${p.name}* (${formatCLP(p.price)}). ¿Está disponible?`);
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
  }

  function checkoutWA() {
    if (!cart.length) return;
    const items = cart.map(p => `• ${p.name} x${p.quantity} — ${formatCLP(p.price * p.quantity)}`).join('\n');
    const total = cart.reduce((a, p) => a + p.price * p.quantity, 0);
    const msg = encodeURIComponent(`Hola UrbanCrown! 👑 Quiero hacer este pedido:\n\n${items}\n\n*Total: ${formatCLP(total)}*\n\n¿Cómo procedo?`);
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
  }

  const cartTotal = cart.reduce((a, p) => a + p.price * p.quantity, 0);
  const cartCount = cart.reduce((a, p) => a + p.quantity, 0);

  return (
    <div className="ustore-root">
      {toast && <div className="ustore-toast">{toast}</div>}

      {/* NAV */}
      <nav className="ustore-nav">
        <a href="#" className="ustore-logo">
          <CrownSVG size={36} />
          <span className="ustore-logo-main">UrbanCrown</span>
        </a>
        <ul className="ustore-nav-links">
          <li><a href="#catalogo">Catálogo</a></li>
          <li><a href="#contacto">Contacto</a></li>
        </ul>
        <button className="ustore-cart-btn" onClick={() => setCartOpen(true)}>
          🛍 Mi bolsa <span className="cart-bubble">{cartCount}</span>
        </button>
      </nav>

      {/* HERO */}
      <section className="ustore-hero">
        <div className="hero-deco-1" /><div className="hero-deco-2" />
        <div className="floating-pill fp1">👑 Envíos a todo Chile</div>
        <div className="floating-pill fp2">✨ Productos de Calidad</div>
        <div className="floating-pill fp3">Gucci</div>
        <div className="hero-badge">✦ Colección 2026 Disponible</div>
        <div className="hero-crown-wrap"><CrownSVG size={88} shadow /></div>
        <h1 className="hero-title">Urban</h1>
        <div className="hero-title-accent">Crown</div>
        <p className="hero-desc">Ropa Gucci en Chile. Colecciones exclusivas y accesorios con envío a todo el país.</p>
        <div className="hero-btns">
          <a href="#catalogo" className="hero-cta-primary">Ver Catálogo 👑</a>
          <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" className="hero-cta-outline">💬 WhatsApp</a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-num">{products.length}+</div>
            <div className="hero-stat-label">Productos</div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <div className="hero-stat-num">100%</div>
            <div className="hero-stat-label">Calidad</div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat">
            <div className="hero-stat-num">🚚</div>
            <div className="hero-stat-label">Todo Chile</div>
          </div>
        </div>
        <div className="hero-deco-stripe" />
      </section>

      {/* FILTROS */}
      <section className="filters-section" id="catalogo">
        <p className="filters-title">Explorar por categoría</p>
        <div className="filters">
          <button className={`filter-btn${activeFilter === 'all' ? ' active' : ''}`} onClick={() => setActiveFilter('all')}>👑 Todos</button>
          {categories.map(c => (
            <button key={c.id} className={`filter-btn${activeFilter === c.slug ? ' active' : ''}`} onClick={() => setActiveFilter(c.slug)}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </section>

      {/* CATÁLOGO */}
      <section className="catalog-section">
        <div className="section-header"><span>{filtered.length} productos disponibles</span></div>
        <div className="products-grid">
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} cartQty={cart.find(c => c.id === p.id)?.quantity || 0} onAdd={() => addToCart(p)} onWA={() => waProduct(p)} />
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ustore-footer" id="contacto">
        <CrownSVG size={44} />
        <div className="footer-logo">UrbanCrown</div>
        <p className="footer-sub">Ropa Gucci · Chile 🇨🇱</p>
        <div className="footer-stripe">
          <div className="footer-stripe-g" />
          <div className="footer-stripe-w" />
          <div className="footer-stripe-r" />
        </div>
        <div className="footer-links">
          <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" className="footer-wa">💬 WhatsApp</a>
          <a href="https://www.instagram.com/urbancrown._/" target="_blank" className="footer-ig">📸 @urbancrown._</a>
        </div>
        <p className="footer-copy">© 2026 UrbanCrown · Todos los derechos reservados</p>
      </footer>

      {/* OVERLAY */}
      {cartOpen && (
        <div onClick={() => setCartOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', zIndex: 199 }} />
      )}

      {/* CARRITO */}
      <div className="cart-panel" style={{ transform: cartOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94)' }}>
        <div className="cart-header">
          <h2 className="cart-title">Mi Bolsa 🛍</h2>
          <button className="cart-close" onClick={() => setCartOpen(false)}>✕</button>
        </div>
        <div className="cart-items-list">
          {cart.length === 0
            ? (
              <div className="cart-empty-state">
                <div style={{ fontSize: 52, opacity: 0.2 }}>👑</div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tu bolsa está vacía</p>
              </div>
            )
            : cart.map(p => (
              <div key={p.id} className="cart-item">
                <div className="cart-item-img">
                  {p.image_url ? <img src={p.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="cart-item-name">{p.name}</p>
                  <p className="cart-item-cat">{p.category_slug}</p>
                  <div className="cart-qty-row">
                    <button className="cart-qty-btn" onClick={() => updateQty(p.id, -1)}>−</button>
                    <span className="cart-qty-num">{p.quantity}</span>
                    <button className="cart-qty-btn" onClick={() => updateQty(p.id, 1)}>+</button>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4 }}>({p.stock} disp.)</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                  <button className="cart-remove" onClick={() => removeFromCart(p.id)}>✕</button>
                  <span className="cart-item-price">{formatCLP(p.price * p.quantity)}</span>
                  {p.quantity > 1 && <span className="cart-item-subtotal">{formatCLP(p.price)} c/u</span>}
                </div>
              </div>
            ))
          }
        </div>
        <div className="cart-footer">
          <div className="cart-total-row">
            <span className="cart-total-label">Total ({cartCount} items)</span>
            <span className="cart-total-value">{formatCLP(cartTotal)}</span>
          </div>
          <button className="btn-checkout" onClick={checkoutWA}>💬 Pedir por WhatsApp</button>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product: p, cartQty, onAdd, onWA }: {
  product: Product; cartQty: number; onAdd: () => void; onWA: () => void;
}) {
  return (
    <div className="product-card">
      <div className="product-img-wrap">
        {p.image_url
          ? <img src={p.image_url} alt={p.name} className="product-img" />
          : <div className="product-placeholder">{p.emoji}</div>
        }
        {p.badge && (
          <span className={`product-badge badge-${p.badge}`}>
            {p.badge === 'new' ? '✨ Nuevo' : '🔥 Popular'}
          </span>
        )}
        {cartQty > 0 && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--red)', color: 'white', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, boxShadow: '0 2px 8px rgba(139,26,26,0.4)' }}>
            {cartQty}
          </div>
        )}
        <div className="product-actions-overlay">
          {p.stock > 0 && (
            <div className="qty-row">
              <button className="qty-btn">−</button>
              <span className="qty-num">{cartQty || 1}</span>
              <button className="qty-btn">+</button>
            </div>
          )}
          <button className="btn-add-overlay" onClick={onAdd} disabled={p.stock === 0}>
            {p.stock === 0 ? 'Sin Stock' : cartQty > 0 ? `+ Agregar otra (${cartQty} en bolsa)` : '+ Agregar a bolsa'}
          </button>
          <button className="btn-wa-overlay" onClick={onWA}>💬 Consultar</button>
        </div>
      </div>
      <div className="product-info">
        <p className="product-cat">{p.category_slug}</p>
        <h3 className="product-name">{p.name}</h3>
        <p className="product-desc">{p.description}</p>
        <div className="product-footer">
          <span className="product-price">{formatCLP(p.price)}</span>
          {p.stock > 0 && p.stock <= 5 && (
            <span className="stock-low">
              <span className="stock-dot" />
              <span className="stock-label">¡Últimas {p.stock}!</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
