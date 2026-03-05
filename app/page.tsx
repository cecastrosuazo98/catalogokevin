import { supabase } from '@/lib/supabase';
import { Product, Category } from '@/types';
import CatalogClient from '@/components/catalog/CatalogClient';

export const revalidate = 60;

async function getProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });
  return data || [];
}

async function getCategories(): Promise<Category[]> {
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  return data || [];
}

export default async function CatalogPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return <CatalogClient products={products} categories={categories} />;
}
