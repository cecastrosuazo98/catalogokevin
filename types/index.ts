export type BadgeType = 'new' | 'hot' | '';
export type StockStatus = 'in' | 'low' | 'out';

export interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category_slug: string;
  emoji: string;
  price: number;
  stock: number;
  badge: BadgeType;
  active: boolean;
  image_url: string | null;
  created_at?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export function getStockStatus(stock: number): StockStatus {
  if (stock === 0) return 'out';
  if (stock <= 3) return 'low';
  return 'in';
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}
