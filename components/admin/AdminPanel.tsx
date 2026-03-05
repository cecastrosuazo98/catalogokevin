'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/cloudinary';
import { Product, Category, formatCLP, getStockStatus } from '@/types';

const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'urbancrown2026';

// ── Paleta oscura Gucci ──────────────────────────────────
const C = {
  red:       '#8B1A1A',
  red2:      '#9B2335',
  redLight:  'rgba(139,26,26,0.15)',
  redSoft:   'rgba(139,26,26,0.08)',
  green:     '#1E3D2F',
  gold:      '#C8961A',
  goldLight: '#F5D060',
  dark:      '#0a0a0a',
  dark2:     '#111111',
  dark3:     '#1a1a1a',
  dark4:     '#222222',
  cardBg:    '#131313',
  cream:     '#e8e0d8',
  text:      '#e8e0d8',
  muted:     '#6b5c4e',
  dim:       '#3a3030',
  border:    'rgba(139,26,26,0.2)',
  borderDim: 'rgba(255,255,255,0.07)',
};

// ── Corona SVG dorada ────────────────────────────────────
function CrownSVG({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.69} viewBox="0 0 160 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="adminGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#F5D060" />
          <stop offset="45%"  stopColor="#C8961A" />
          <stop offset="100%" stopColor="#8B6410" />
        </linearGradient>
      </defs>
      <rect x="12" y="76" width="136" height="22" rx="4" fill="url(#adminGold)" />
      <polygon points="26,76 14,24 46,50"   fill="url(#adminGold)" />
      <polygon points="56,76 38,10 72,44"   fill="url(#adminGold)" />
      <polygon points="80,76 70,4 90,4 80,76" fill="url(#adminGold)" />
      <polygon points="104,76 88,44 122,10" fill="url(#adminGold)" />
      <polygon points="134,76 114,50 146,24" fill="url(#adminGold)" />
      <circle cx="80" cy="87" r="7"  fill="#0a0a0a" stroke="#C8961A" strokeWidth="1.5" />
      <circle cx="34" cy="87" r="4"  fill="#0a0a0a" stroke="#C8961A" strokeWidth="1" />
      <circle cx="126" cy="87" r="4" fill="#0a0a0a" stroke="#C8961A" strokeWidth="1" />
      <line x1="80" y1="6"  x2="77" y2="18" stroke="rgba(255,255,255,0.55)" strokeWidth="2"   strokeLinecap="round" />
      <line x1="56" y1="13" x2="54" y2="24" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="104" y1="13" x2="106" y2="24" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function formatPriceInput(val: string): string {
  const num = val.replace(/\D/g, '');
  if (!num) return '';
  return parseInt(num).toLocaleString('es-CL');
}
function parsePriceInput(val: string): number {
  return parseInt(val.replace(/\./g, '')) || 0;
}

export default function AdminPanel() {
  const [logged, setLogged]         = useState(false);
  const [loginPass, setLoginPass]   = useState('');
  const [loginError, setLoginError] = useState(false);
  const [tab, setTab]               = useState<'dashboard' | 'products' | 'categories'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [products,   setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState('');

  const [modal,       setModal]       = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', category_slug: 'ropa', emoji: '👑', priceDisplay: '', stock: '', badge: '', active: true });
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);

  const [catModal, setCatModal] = useState(false);
  const [catForm,  setCatForm]  = useState({ name: '', emoji: '' });
  const [editingStock, setEditingStock] = useState<{ id: string; val: string } | null>(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
    ]);
    setProducts(prods || []);
    setCategories(cats || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!logged) return;
    fetchAll();
    const channel = supabase.channel('admin-products')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, (payload) => {
        setProducts(prev => prev.map(p => p.id === (payload.new as Product).id ? { ...p, ...(payload.new as Product) } : p));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [logged, fetchAll]);

  function doLogin() {
    if (loginPass === ADMIN_PASS) { setLogged(true); setLoginError(false); }
    else setLoginError(true);
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  }

  const stats = {
    total:   products.length,
    inStock: products.filter(p => p.stock > 3).length,
    low:     products.filter(p => p.stock > 0 && p.stock <= 3).length,
    out:     products.filter(p => p.stock === 0).length,
  };
  const alerts = products.filter(p => p.stock <= 3);

  function openModal(product?: Product) {
    if (product) {
      setEditingId(product.id);
      setForm({ name: product.name, description: product.description, category_slug: product.category_slug, emoji: product.emoji, priceDisplay: formatPriceInput(String(product.price)), stock: String(product.stock), badge: product.badge, active: product.active });
      setImagePreview(product.image_url);
    } else {
      setEditingId(null);
      setForm({ name: '', description: '', category_slug: categories[0]?.slug || 'ropa', emoji: '👑', priceDisplay: '', stock: '', badge: '', active: true });
      setImagePreview(null);
    }
    setImageFile(null);
    setModal(true);
  }

  async function saveProduct() {
    const price = parsePriceInput(form.priceDisplay);
    if (!form.name || !price || !form.stock) { showToast('Completa nombre, precio y stock', 'error'); return; }
    setSaving(true);
    try {
      let image_url = imagePreview;
      if (imageFile) image_url = await uploadImage(imageFile);
      const payload = { name: form.name, description: form.description, category_slug: form.category_slug, emoji: form.emoji, price, stock: parseInt(form.stock), badge: form.badge, active: form.active, image_url };
      if (editingId) {
        await supabase.from('products').update(payload).eq('id', editingId);
        showToast('¡Producto actualizado! 👑');
      } else {
        await supabase.from('products').insert([payload]);
        showToast('¡Producto agregado! ✨');
      }
      setModal(false); fetchAll();
    } catch { showToast('Error al guardar', 'error'); }
    finally { setSaving(false); }
  }

  async function toggleActive(p: Product) {
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: !p.active } : x));
    const { error } = await supabase.from('products').update({ active: !p.active }).eq('id', p.id);
    if (error) { setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: p.active } : x)); showToast('Error al actualizar', 'error'); }
    else showToast(p.active ? 'Producto ocultado' : 'Producto visible 👑');
  }

  async function updateStock(id: string, newStock: number) {
    if (newStock < 0) return;
    setProducts(prev => prev.map(x => x.id === id ? { ...x, stock: newStock } : x));
    const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', id);
    if (error) showToast('Error al guardar stock', 'error');
    else showToast('Stock actualizado ✓');
  }

  async function deleteProduct(id: string) {
    if (!confirm('¿Eliminar este producto?')) return;
    await supabase.from('products').delete().eq('id', id);
    showToast('Producto eliminado'); fetchAll();
  }

  async function saveCategory() {
    if (!catForm.name) return;
    const slug = catForm.name.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    await supabase.from('categories').insert([{ name: catForm.name, slug, emoji: catForm.emoji || '👑' }]);
    showToast('Categoría creada ✨'); setCatModal(false); setCatForm({ name: '', emoji: '' }); fetchAll();
  }

  async function deleteCategory(id: string) {
    if (!confirm('¿Eliminar esta categoría?')) return;
    await supabase.from('categories').delete().eq('id', id);
    showToast('Categoría eliminada'); fetchAll();
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category_slug.toLowerCase().includes(search.toLowerCase())
  );

  // ── Estilos reutilizables ────────────────────────────
  const card = { background: C.cardBg, borderRadius: 20, padding: '20px 16px', border: `1px solid ${C.borderDim}`, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' };
  const cardWide = { background: C.cardBg, borderRadius: 20, padding: 24, border: `1px solid ${C.borderDim}`, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' };

  // ══════════════════════════════════════════════════════
  // LOGIN
  // ══════════════════════════════════════════════════════
  if (!logged) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.dark, fontFamily: "'DM Sans',sans-serif", padding: 16, position: 'relative', overflow: 'hidden' }}>
      {/* Decos */}
      <div style={{ position: 'fixed', top: -150, right: -150, width: 550, height: 550, background: 'radial-gradient(circle, rgba(139,26,26,0.1) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -120, left: -120, width: 450, height: 450, background: 'radial-gradient(circle, rgba(30,61,47,0.08) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, background: C.cardBg, borderRadius: 32, padding: 'clamp(28px,6vw,48px)', boxShadow: '0 20px 80px rgba(0,0,0,0.6)', border: `1px solid ${C.border}`, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <CrownSVG size={64} />
          </div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.cream }}>UrbanCrown</div>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.muted, marginTop: 4 }}>Panel de Administración</div>
        </div>

        <label style={{ display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>Contraseña</label>
        <input
          type="password" value={loginPass}
          onChange={e => setLoginPass(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doLogin()}
          placeholder="••••••••"
          style={{ width: '100%', padding: '14px 16px', background: C.dark3, border: `1.5px solid ${loginError ? C.red : C.borderDim}`, borderRadius: 14, color: C.cream, fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 8 }}
        />
        {loginError && <p style={{ fontSize: 11, color: '#e88', marginBottom: 10, fontWeight: 600 }}>⚠️ Contraseña incorrecta</p>}
        <button onClick={doLogin}
          style={{ width: '100%', padding: 16, background: `linear-gradient(135deg, ${C.red}, ${C.red2})`, color: 'white', border: 'none', borderRadius: 100, fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px rgba(139,26,26,0.4)', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Entrar al Panel 👑
        </button>
      </div>
    </div>
  );

  // ── Sidebar content ──────────────────────────────────
  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CrownSVG size={36} />
          <div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.cream }}>UrbanCrown</div>
            <div style={{ fontSize: 8, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.muted, marginTop: 2 }}>Panel de Control</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {([
          ['dashboard', '⊞', 'Dashboard'],
          ['products',  '🛍', 'Productos'],
          ['categories','👑', 'Categorías'],
        ] as const).map(([t, icon, label]) => (
          <div key={t} onClick={() => { setTab(t); setSidebarOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 20px', fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s', borderLeft: `3px solid ${tab === t ? C.red : 'transparent'}`, color: tab === t ? '#e88' : C.muted, background: tab === t ? C.redSoft : 'transparent' }}>
            <span style={{ fontSize: 16 }}>{icon}</span> {label}
          </div>
        ))}
        <a href="/" target="_blank" onClick={() => setSidebarOpen(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 20px', fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, textDecoration: 'none', borderLeft: '3px solid transparent' }}>
          <span style={{ fontSize: 16 }}>↗</span> Ver Catálogo
        </a>
      </nav>

      {/* User */}
      <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${C.red}, ${C.red2})`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👑</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.cream }}>Admin</div>
            <div style={{ fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted }}>Administrador</div>
          </div>
        </div>
        <button onClick={() => setLogged(false)}
          style={{ width: '100%', padding: 9, background: 'transparent', border: `1.5px solid ${C.borderDim}`, borderRadius: 100, color: C.muted, fontSize: 9, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Cerrar sesión
        </button>
      </div>
    </>
  );

  // ══════════════════════════════════════════════════════
  // MAIN LAYOUT
  // ══════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.dark2, fontFamily: "'DM Sans',sans-serif" }}>

      {/* Toast */}
      {toast.show && (
        <div style={{ position: 'fixed', bottom: 28, right: 16, padding: '14px 24px', zIndex: 500, borderRadius: 100, background: toast.type === 'success' ? C.dark3 : C.red, color: C.cream, fontSize: 12, fontWeight: 600, boxShadow: '0 8px 30px rgba(0,0,0,0.5)', maxWidth: 'calc(100vw - 32px)', letterSpacing: '0.05em', border: `1px solid ${C.border}` }}>
          {toast.msg}
        </div>
      )}

      {/* Mobile topbar */}
      <div className="mobile-topbar" style={{ background: C.dark }}>
        <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}><span /><span /><span /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CrownSVG size={26} />
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.cream }}>UrbanCrown</span>
        </div>
        <div style={{ width: 38 }} />
      </div>

      {/* Sidebar overlay mobile */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 70, backdropFilter: 'blur(4px)' }} />}

      {/* Sidebar mobile */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: 240, height: '100vh', background: C.dark, zIndex: 80, display: 'flex', flexDirection: 'column', boxShadow: `4px 0 20px rgba(0,0,0,0.5)`, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s ease', borderRight: `1px solid ${C.border}` }}>
        {sidebarContent}
      </div>

      {/* Sidebar desktop */}
      <aside className="desktop-sidebar" style={{ width: 240, background: C.dark, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 50, boxShadow: '4px 0 30px rgba(0,0,0,0.4)' }}>
        {sidebarContent}
      </aside>

      {/* Main */}
      <main className="admin-main" style={{ marginLeft: 240, flex: 1, padding: 40, minWidth: 0 }}>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(32px,5vw,44px)', fontWeight: 900, fontStyle: 'italic', color: C.cream, lineHeight: 1 }}>
                Bienvenido, <span style={{ color: '#e88' }}>UrbanCrown 👑</span>
              </h1>
              <p style={{ fontSize: 10, color: C.muted, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 6 }}>Resumen de tu catálogo</p>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Productos', value: stats.total,   icon: '🛍', color: C.goldLight,  bg: 'rgba(200,150,26,0.1)' },
                { label: 'Con Stock', value: stats.inStock, icon: '✅', color: '#4ade80',     bg: 'rgba(22,163,74,0.1)' },
                { label: 'Stock Bajo',value: stats.low,     icon: '⚠️', color: '#fb923c',     bg: 'rgba(234,88,12,0.1)' },
                { label: 'Sin Stock', value: stats.out,     icon: '❌', color: '#e88',         bg: C.redSoft },
              ].map(s => (
                <div key={s.label} style={{ ...card }}>
                  <div style={{ width: 40, height: 40, background: s.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>{s.icon}</div>
                  <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>{s.label}</p>
                  <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 700, fontStyle: 'italic', color: s.color, lineHeight: 1 }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ ...cardWide }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, marginBottom: 14 }}>⚠️ Alertas de Stock</p>
                {alerts.length === 0
                  ? <p style={{ fontSize: 13, color: '#4ade80', fontWeight: 600 }}>✓ Todo el stock en orden 👑</p>
                  : alerts.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.borderDim}` }}>
                      <div style={{ width: 38, height: 38, background: C.dark4, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{p.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, color: C.cream, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                        <p style={{ fontSize: 10, color: C.muted }}>{p.stock === 0 ? 'Sin stock' : `Solo ${p.stock} unidades`}</p>
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: 100, fontSize: 9, fontWeight: 700, background: p.stock === 0 ? C.redSoft : 'rgba(234,88,12,0.1)', color: p.stock === 0 ? '#e88' : '#fb923c', flexShrink: 0 }}>
                        {p.stock === 0 ? 'Agotado' : 'Stock bajo'}
                      </span>
                    </div>
                  ))}
              </div>

              <div style={{ ...cardWide }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.muted, marginBottom: 14 }}>👑 Productos Recientes</p>
                {products.slice(0, 5).map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.borderDim}` }}>
                    <div style={{ width: 38, height: 38, background: C.dark4, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden', flexShrink: 0 }}>
                      {p.image_url ? <img src={p.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={p.name} /> : p.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, color: C.cream, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                      <p style={{ fontSize: 10, color: C.muted }}>{p.category_slug}</p>
                    </div>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, fontStyle: 'italic', color: C.goldLight, fontWeight: 700, flexShrink: 0 }}>{formatCLP(p.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PRODUCTOS ── */}
        {tab === 'products' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(28px,5vw,44px)', fontWeight: 900, fontStyle: 'italic', color: C.cream }}>
                Productos<span style={{ color: C.red }}>.</span>
              </h1>
              <button className="admin-btn-primary" onClick={() => openModal()}>+ Agregar</button>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar producto..." className="admin-input" style={{ marginBottom: 16 }} />
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>{['', 'Producto', 'Categoría', 'Precio', 'Stock', 'Estado', 'Acciones'].map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const status = getStockStatus(p.stock);
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.dark4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, overflow: 'hidden' }}>
                            {p.image_url ? <img src={p.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={p.name} /> : p.emoji}
                          </div>
                        </td>
                        <td>
                          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, color: C.cream, fontWeight: 700 }}>{p.name}</p>
                          <p style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{p.description}</p>
                        </td>
                        <td>
                          <span style={{ padding: '3px 10px', borderRadius: 100, background: 'rgba(30,61,47,0.2)', color: '#6abf8a', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{p.category_slug}</span>
                        </td>
                        <td style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontStyle: 'italic', color: C.goldLight, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatCLP(p.price)}</td>
                        <td>
                          {editingStock?.id === p.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <button onClick={() => setEditingStock({ id: p.id, val: String(Math.max(0, parseInt(editingStock.val || '0') - 1)) })}
                                style={{ width: 26, height: 26, borderRadius: '50%', border: `1.5px solid ${C.borderDim}`, background: C.dark4, color: '#e88', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                              <input type="number" min="0" value={editingStock.val}
                                onChange={e => setEditingStock({ id: p.id, val: e.target.value })}
                                onBlur={() => { updateStock(p.id, parseInt(editingStock.val) || 0); setEditingStock(null); }}
                                onKeyDown={e => { if (e.key === 'Enter') { updateStock(p.id, parseInt(editingStock.val) || 0); setEditingStock(null); } if (e.key === 'Escape') setEditingStock(null); }}
                                style={{ width: 52, padding: '4px 6px', textAlign: 'center', border: `1.5px solid ${C.red}`, borderRadius: 8, fontSize: 13, fontWeight: 700, color: C.cream, outline: 'none', background: C.dark4 }} autoFocus />
                              <button onClick={() => setEditingStock({ id: p.id, val: String(parseInt(editingStock.val || '0') + 1) })}
                                style={{ width: 26, height: 26, borderRadius: '50%', border: `1.5px solid ${C.borderDim}`, background: C.dark4, color: '#e88', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                            </div>
                          ) : (
                            <span onClick={() => setEditingStock({ id: p.id, val: String(p.stock) })} title="Click para editar"
                              style={{ padding: '5px 12px', borderRadius: 100, fontSize: 9, fontWeight: 700, background: status === 'in' ? 'rgba(22,163,74,0.15)' : status === 'low' ? 'rgba(234,88,12,0.15)' : C.redSoft, color: status === 'in' ? '#4ade80' : status === 'low' ? '#fb923c' : '#e88', whiteSpace: 'nowrap', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px dashed transparent', transition: 'all 0.2s' }}
                              onMouseEnter={e => (e.currentTarget.style.borderColor = C.red)}
                              onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
                              ✏️ {status === 'in' ? `${p.stock} uds.` : status === 'low' ? `${p.stock} ⚠️` : 'Sin stock'}
                            </span>
                          )}
                        </td>
                        <td><span style={{ fontSize: 10, fontWeight: 700, color: p.active ? '#4ade80' : C.muted, whiteSpace: 'nowrap' }}>{p.active ? '● Visible' : '○ Oculto'}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            <button className="admin-btn-ghost" onClick={() => openModal(p)}>Editar</button>
                            <button className="admin-btn-ghost" onClick={() => toggleActive(p)} style={{ color: p.active ? '#fb923c' : '#4ade80', borderColor: p.active ? 'rgba(234,88,12,0.25)' : 'rgba(22,163,74,0.25)' }}>{p.active ? 'Ocultar' : 'Mostrar'}</button>
                            <button className="admin-btn-danger" onClick={() => deleteProduct(p.id)}>✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CATEGORÍAS ── */}
        {tab === 'categories' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(28px,5vw,44px)', fontWeight: 900, fontStyle: 'italic', color: C.cream }}>
                Categorías<span style={{ color: C.red }}>.</span>
              </h1>
              <button className="admin-btn-primary" onClick={() => setCatModal(true)}>+ Nueva</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 14 }}>
              {categories.map(c => (
                <div key={c.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, rgba(30,61,47,0.25), rgba(139,26,26,0.15))', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{c.emoji}</div>
                  <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, fontWeight: 700, color: C.cream }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{products.filter(p => p.category_slug === c.slug).length} productos</div>
                  <button className="admin-btn-danger" onClick={() => deleteCategory(c.id)} style={{ alignSelf: 'flex-start', marginTop: 4 }}>Eliminar</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ══ MODAL PRODUCTO ══ */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 560, background: C.cardBg, borderRadius: 28, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 30px 100px rgba(0,0,0,0.7)', border: `1px solid ${C.border}` }}>
            <div style={{ padding: '24px 28px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.dark3, borderRadius: '28px 28px 0 0', position: 'sticky', top: 0, zIndex: 1 }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontStyle: 'italic', fontWeight: 700, color: C.cream }}>{editingId ? '✏️ Editar Producto' : '👑 Nuevo Producto'}</h2>
              <button onClick={() => setModal(false)} style={{ width: 34, height: 34, borderRadius: '50%', background: C.dark4, border: `1px solid ${C.borderDim}`, color: C.muted, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
            </div>
            <div className="form-grid" style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="full-col" style={{ gridColumn: '1/-1' }}>
                <label className="admin-label">Foto del Producto</label>
                <div onClick={() => document.getElementById('imgInput')?.click()}
                  style={{ border: `2px dashed ${C.border}`, borderRadius: 18, padding: 20, textAlign: 'center', cursor: 'pointer', background: C.dark3 }}>
                  {imagePreview
                    ? <img src={imagePreview} style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 14 }} alt="preview" />
                    : <div><div style={{ fontSize: 32, marginBottom: 6 }}>📸</div><p style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Toca para subir foto</p></div>}
                  <input id="imgInput" type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                </div>
              </div>
              <div className="full-col" style={{ gridColumn: '1/-1' }}>
                <label className="admin-label">Nombre del Producto</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Camiseta GG Supreme" className="admin-input" />
              </div>
              <div className="full-col" style={{ gridColumn: '1/-1' }}>
                <label className="admin-label">Descripción</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Algodón pima, logo bordado" className="admin-input" />
              </div>
              <div>
                <label className="admin-label">Categoría</label>
                <select value={form.category_slug} onChange={e => setForm(f => ({ ...f, category_slug: e.target.value }))} className="admin-input" style={{ appearance: 'none', cursor: 'pointer' }}>
                  {categories.map(c => <option key={c.id} value={c.slug}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-label">Emoji</label>
                <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="👑" maxLength={2} className="admin-input" style={{ fontSize: 24 }} />
              </div>
              <div>
                <label className="admin-label">Precio</label>
                <div className="price-input-wrap">
                  <span className="price-prefix">$</span>
                  <input value={form.priceDisplay} onChange={e => setForm(f => ({ ...f, priceDisplay: formatPriceInput(e.target.value) }))} placeholder="89.990" className="admin-input" inputMode="numeric" />
                </div>
                {form.priceDisplay && <p style={{ fontSize: 10, color: C.goldLight, marginTop: 4, fontWeight: 600 }}>= {formatCLP(parsePriceInput(form.priceDisplay))}</p>}
              </div>
              <div>
                <label className="admin-label">Stock</label>
                <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="10" min="0" className="admin-input" inputMode="numeric" />
              </div>
              <div>
                <label className="admin-label">Badge</label>
                <select value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} className="admin-input" style={{ appearance: 'none', cursor: 'pointer' }}>
                  <option value="">Sin badge</option>
                  <option value="new">✨ Nuevo</option>
                  <option value="hot">🔥 Popular</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label className="admin-label" style={{ marginBottom: 0 }}>Visible en catálogo</label>
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: C.red }} />
              </div>
            </div>
            <div style={{ padding: '14px 28px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
              <button onClick={() => setModal(false)} className="admin-btn-ghost">Cancelar</button>
              <button onClick={saveProduct} disabled={saving} className="admin-btn-primary" style={{ opacity: saving ? 0.7 : 1 }}>
                {saving ? '⏳ Guardando...' : '👑 Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL CATEGORÍA ══ */}
      {catModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 380, background: C.cardBg, borderRadius: 28, overflow: 'hidden', boxShadow: '0 30px 100px rgba(0,0,0,0.7)', border: `1px solid ${C.border}` }}>
            <div style={{ padding: '22px 24px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.dark3 }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontStyle: 'italic', fontWeight: 700, color: C.cream }}>👑 Nueva Categoría</h2>
              <button onClick={() => setCatModal(false)} style={{ width: 30, height: 30, borderRadius: '50%', background: C.dark4, border: `1px solid ${C.borderDim}`, color: C.muted, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label className="admin-label">Nombre</label><input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Ropa" className="admin-input" /></div>
              <div><label className="admin-label">Emoji</label><input value={catForm.emoji} onChange={e => setCatForm(f => ({ ...f, emoji: e.target.value }))} placeholder="👑" maxLength={2} className="admin-input" style={{ fontSize: 24 }} /></div>
            </div>
            <div style={{ padding: '10px 24px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setCatModal(false)} className="admin-btn-ghost">Cancelar</button>
              <button onClick={saveCategory} className="admin-btn-primary">👑 Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
