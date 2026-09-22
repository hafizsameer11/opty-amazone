'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { getAxiosErrorMessage } from '@/lib/api-client';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { warehouseService, type WarehouseCategory, type WarehouseProduct } from '@/services/warehouse-service';
import { SellerShell } from '@/components/warehouse/SellerShell';

const money = (value: string | number) => `€${Number(value || 0).toFixed(2)}`;

export default function WarehousePage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [products, setProducts] = useState<WarehouseProduct[]>([]);
  const [categories, setCategories] = useState<WarehouseCategory[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await warehouseService.products({ search, type, per_page: 48 });
      setProducts(data.products.data);
      setCategories(data.categories);
      setCartCount(data.cart_count);
    } catch (error) {
      if (!silent) showToast('error', getAxiosErrorMessage(error));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [search, showToast, type]);

  useEffect(() => { void load(); }, [load]);
  // Immediate refreshes after cart mutations, plus quiet reconciliation of
  // inventory/availability changed by the admin in another session.
  useLiveRefresh(() => load(true), true, 10000);

  const openProduct = (productId: number) => router.push(`/warehouse/${productId}`);

  return (
    <SellerShell>
      <main className="w-full max-w-none space-y-5 px-4 py-5 sm:px-5 lg:px-6 2xl:px-8">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#062b5c] via-[#0066CC] to-[#008b78] p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-100">Optical supply</p>
              <h1 className="mt-2 text-3xl font-bold">Warehouse</h1>
              <p className="mt-2 max-w-xl text-sm text-white/80">Purchase ready-to-sell optical stock directly from the platform warehouse using your Seller Wallet.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/warehouse/orders"><Button variant="outline" className="!border-white/60 !bg-white/10 !text-white hover:!bg-white/20">Warehouse Orders</Button></Link>
              <Link href="/warehouse/cart"><Button className="!bg-[#0066CC] !text-white hover:!bg-[#0052A3]">Cart {cartCount ? `(${cartCount})` : ''}</Button></Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 lg:flex-row">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search warehouse products or SKU…" className="flex-1" />
            <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-slate-300 px-3 text-sm"><option value="">All warehouse categories</option>{categories.map((category) => <option key={category.id} value={category.type}>{category.name}</option>)}</select>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{categories.map((category) => <button key={category.id} type="button" onClick={() => setType(category.type)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${type === category.type ? 'bg-[#0066CC] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{category.name}</button>)}</div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? <p className="col-span-full py-12 text-center text-slate-500">Loading warehouse stock…</p> : products.length ? products.map((product) => (
            <article
              key={product.id}
              role="link"
              tabIndex={0}
              aria-label={`Open ${product.name}`}
              onClick={() => openProduct(product.id)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openProduct(product.id); } }}
              className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
            >
              <div className="relative h-48 bg-slate-100">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-5xl">◫</div>}<span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow">{product.stock_quantity} in stock</span></div>
              <div className="p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#0066CC]">{product.category?.name}</p><h2 className="mt-1 truncate text-lg font-bold text-slate-950">{product.name}</h2><p className="mt-1 font-mono text-xs text-slate-500">{product.sku}</p><p className="mt-3 min-h-10 text-sm text-slate-600">{product.description || 'Warehouse wholesale product'}</p><div className="mt-4 flex items-end justify-between"><div><p className="text-xl font-bold text-slate-950">{money(product.price)}</p><p className="text-xs text-slate-500">Shipping {money(product.shipping_fee)}</p></div><Button size="sm" onClick={(event) => { event.stopPropagation(); openProduct(product.id); }}>View Product</Button></div></div>
            </article>
          )) : <div className="col-span-full rounded-2xl bg-white p-12 text-center text-slate-500 shadow-sm">No available warehouse products match your search.</div>}
        </section>
      </main>
    </SellerShell>
  );
}
