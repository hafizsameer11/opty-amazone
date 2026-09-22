'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getAxiosErrorMessage } from '@/lib/api-client';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { warehouseService, type WarehouseProduct } from '@/services/warehouse-service';
import { SellerShell } from '@/components/warehouse/SellerShell';

const money = (value: string | number) => `€${Number(value || 0).toFixed(2)}`;

export default function WarehouseProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [product, setProduct] = useState<WarehouseProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);

  const loadProduct = useCallback(async (silent = false) => {
    try {
      const nextProduct = await warehouseService.product(Number(id));
      setProduct(nextProduct);
      setQuantity((current) => Math.max(1, Math.min(current, nextProduct.stock_quantity || 1)));
    } catch (error) {
      if (!silent) showToast('error', getAxiosErrorMessage(error));
    }
  }, [id, showToast]);

  useEffect(() => { void loadProduct(); }, [loadProduct]);
  useLiveRefresh(() => loadProduct(true), true, 10000);

  const add = async (buyNow = false) => {
    if (!product || product.stock_quantity < 1) return;
    try {
      setBusy(true);
      await warehouseService.addToCart(product.id, quantity);
      showToast('success', 'Added to warehouse cart.');
      if (buyNow) router.push('/warehouse/cart');
    } catch (error) {
      showToast('error', getAxiosErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (!product) return <SellerShell><main className="w-full px-4 py-12 text-center text-slate-500">Loading warehouse product…</main></SellerShell>;

  const facts = product.category.type === 'eyeglasses'
    ? [['Color', product.color], ['Temple size', product.temple_size], ['Lens size', product.lens_size], ['Bridge size', product.bridge_size]]
    : Object.entries(product.details || {}).filter(([, value]) => value !== null && value !== false).map(([key, value]) => [key.replaceAll('_', ' '), String(value)]);

  const updateQuantity = (next: number) => setQuantity(Math.max(1, Math.min(product.stock_quantity, next)));

  return <SellerShell><main className="w-full max-w-none px-4 py-5 pb-28 sm:px-5 lg:px-6 lg:pb-6 2xl:px-8">
    <Link href="/warehouse" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0066CC] transition hover:text-[#0052A3]"><span aria-hidden>←</span> Back to Warehouse</Link>
    <section className="mt-4 grid items-start gap-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5 xl:grid-cols-[minmax(280px,.82fr)_minmax(0,1.18fr)] xl:gap-8 xl:p-7">
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="relative aspect-[16/10] w-full sm:aspect-[4/3] xl:aspect-[5/4]">
          {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-contain p-3 sm:p-5" /> : <span className="grid h-full place-items-center text-7xl text-slate-300">◫</span>}
          <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${product.stock_quantity > 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}</span>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#0066CC]">{product.category.name}</span><span className="font-mono text-xs text-slate-500">SKU {product.sku}</span></div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{product.name}</h1>

        <div className="mt-4 grid gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 sm:grid-cols-2 sm:items-center">
          <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Warehouse unit price</p><p className="mt-1 text-3xl font-bold text-slate-950">{money(product.price)}</p></div>
          <div className="border-t border-blue-100 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Shipping per order</p><p className="mt-1 text-lg font-bold text-slate-900">{money(product.shipping_fee)}</p><p className="mt-1 text-xs text-slate-500">Charged from Seller Wallet at checkout</p></div>
        </div>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-bold text-slate-950">Choose quantity</p><p className="mt-1 text-xs text-slate-500">Select up to {product.stock_quantity} units currently available.</p></div><QuantityControl quantity={quantity} max={product.stock_quantity} disabled={busy || product.stock_quantity < 1} onChange={updateQuantity} /></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><Button variant="outline" disabled={busy || product.stock_quantity < 1} onClick={() => void add(false)} className="!h-12 !rounded-xl !border-[#0066CC] !font-bold !text-[#0066CC] hover:!bg-blue-50"><span className="mr-2" aria-hidden>🛒</span>Add to Cart</Button><Button disabled={busy || product.stock_quantity < 1} onClick={() => void add(true)} className="!h-12 !rounded-xl !bg-[#0066CC] !font-bold !text-white hover:!bg-[#0052A3]">{busy ? 'Adding…' : <><span className="mr-2" aria-hidden>⚡</span>Buy Now</>}</Button></div>
        </section>

        {product.description && <section className="mt-5 border-t border-slate-100 pt-5"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Product description</h2><p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-6 text-slate-600">{product.description}</p></section>}
        {facts.length > 0 && <section className="mt-5 border-t border-slate-100 pt-5"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Product specifications</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{facts.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"><span className="text-sm capitalize text-slate-500">{label}</span><strong className="text-right text-sm text-slate-900">{value || '—'}</strong></div>)}</div></section>}
      </div>
    </section>
  </main></SellerShell>;
}

function QuantityControl({ quantity, max, disabled, onChange }: { quantity: number; max: number; disabled: boolean; onChange: (next: number) => void }) {
  return <div className="inline-flex h-12 items-center rounded-xl border border-slate-300 bg-slate-50 p-1 shadow-inner"><button type="button" disabled={disabled || quantity <= 1} onClick={() => onChange(quantity - 1)} aria-label="Decrease quantity" className="grid h-10 w-10 place-items-center rounded-lg text-xl font-bold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">−</button><label className="sr-only" htmlFor="warehouse-product-quantity">Quantity</label><input id="warehouse-product-quantity" aria-label="Quantity" type="number" inputMode="numeric" min="1" max={max} disabled={disabled} value={quantity} onChange={(event) => onChange(Number(event.target.value) || 1)} className="h-10 w-14 border-x border-slate-200 bg-white text-center text-base font-bold text-slate-950 outline-none disabled:text-slate-400" /><button type="button" disabled={disabled || quantity >= max} onClick={() => onChange(quantity + 1)} aria-label="Increase quantity" className="grid h-10 w-10 place-items-center rounded-lg text-xl font-bold text-[#0066CC] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">+</button></div>;
}
