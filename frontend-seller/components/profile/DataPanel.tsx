'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import ProductDetailsModal from '@/components/products/ProductDetailsModal';
import OrderDetailsModal from '@/components/orders/OrderDetailsModal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { getApiOrigin } from '@/lib/api-client';
import { getProductEditPath } from '@/lib/product-edit-routes';
import { productService, type Product } from '@/services/product-service';
import { orderService, type StoreOrder } from '@/services/order-service';
import { StoreService } from '@/services/store-service';
import { useLanguage } from '@/contexts/LanguageContext';

type DataPanelKind = 'products' | 'orders' | 'analytics';
type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';

type DashboardSummary = {
  total_products?: number;
  total_orders?: number;
  total_revenue?: number;
  total_followers?: number;
};

type ProductListResponse = { data?: Product[] } | Product[];

const ORDER_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'warning' },
  awaiting_payment: { label: 'Awaiting payment', variant: 'info' },
  rejected: { label: 'Rejected', variant: 'error' },
  paid: { label: 'Paid', variant: 'success' },
  out_for_delivery: { label: 'Out for delivery', variant: 'primary' },
  delivered: { label: 'Delivered', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'error' },
};

function resolveImageUrl(image?: string): string | null {
  if (!image) return null;
  if (/^(https?:|data:)/i.test(image)) return image;

  const origin = getApiOrigin().replace(/\/$/, '');
  return `${origin}${image.startsWith('/') ? image : `/${image}`}`;
}

function productStockVariant(product: Product): BadgeVariant {
  if (product.stock_status === 'in_stock') return 'success';
  if (product.stock_status === 'out_of_stock') return 'error';
  return 'warning';
}

function ProductImagePlaceholder() {
  return (
    <svg className="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m4 16 4.6-4.6a2 2 0 0 1 2.8 0L16 16m-2-2 1.6-1.6a2 2 0 0 1 2.8 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

export default function DataPanel({ kind }: { kind: DataPanelKind }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [analytics, setAnalytics] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);

  const loadPanelData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');

      if (kind === 'products') {
        const response = await productService.getAll({ per_page: 12 }) as ProductListResponse;
        setProducts(Array.isArray(response) ? response : response.data || []);
      } else if (kind === 'orders') {
        const response = await orderService.getOrders({ per_page: 12 });
        setOrders(response.data || []);
      } else {
        const response = await StoreService.getDashboard();
        setAnalytics(response.data || {});
      }
    } catch (loadError) {
      console.error(`Failed to load seller ${kind}:`, loadError);
      setError(`Could not load your ${kind} right now.`);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void loadPanelData();
  }, [loadPanelData]);

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(t('data.deleteConfirm', { name: product.name }))) return;

    try {
      setDeletingProductId(product.id);
      setError('');
      await productService.delete(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      void loadPanelData(true);
    } catch (deleteError) {
      console.error('Failed to delete product:', deleteError);
      setError(t('data.deleteFailed'));
    } finally {
      setDeletingProductId(null);
    }
  };

  const closeProductDetails = () => setSelectedProductId(null);
  const closeOrderDetails = () => setSelectedOrderId(null);

  if (loading) {
    return (
      <div className={kind === 'products' ? 'grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3' : 'space-y-4'}>
        {[1, 2, 3].map((item) => (
          <div key={item} className={kind === 'products' ? 'h-[355px] animate-pulse rounded-2xl bg-slate-200' : 'h-48 animate-pulse rounded-2xl bg-slate-200'} />
        ))}
      </div>
    );
  }

  if (error && (kind === 'analytics' || (kind === 'products' && products.length === 0) || (kind === 'orders' && orders.length === 0))) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-800">{error}</p>
        <Button className="mt-4" size="sm" onClick={() => void loadPanelData()}>
          {t('data.tryAgain')}
        </Button>
      </div>
    );
  }

  if (kind === 'products') {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0066CC]">{t('data.catalogue')}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">{t('data.myProducts')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('data.productsDescription')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/products/new" className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#0066CC] to-[#0052A3] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-[#0052A3] hover:to-[#004080]">
              {t('data.addProduct')}
            </Link>
            <Link href="/products" className="inline-flex items-center justify-center rounded-lg border-2 border-[#0066CC] px-4 py-2 text-sm font-semibold text-[#0066CC] transition hover:bg-blue-50">
              {t('data.manageAll')}
            </Link>
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {products.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0066CC]">
              <ProductImagePlaceholder />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">{t('data.catalogueEmptyTitle')}</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{t('data.catalogueEmptyDescription')}</p>
            <Link href="/products/new" className="mt-5 inline-flex rounded-lg bg-[#0066CC] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0052a3]">
              {t('data.addFirstProduct')}
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
            {products.map((product) => {
              const primaryImage = resolveImageUrl(product.images?.[0]);

              return (
                <article key={product.id} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#0066CC]/35 hover:shadow-lg">
                  <div className="relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 sm:h-44">
                    {primaryImage ? (
                      <img src={primaryImage} alt={product.name} className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-105" />
                    ) : (
                      <ProductImagePlaceholder />
                    )}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      {product.is_featured && <Badge variant="primary" size="sm">{t('data.featured')}</Badge>}
                      <Badge variant={product.is_active ? 'success' : 'default'} size="sm">
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {product.is_muted && <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">{t('data.muted')}</span>}
                  </div>

                  <div className="flex flex-1 flex-col p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{product.product_type.replace('_', ' ')}</p>
                        <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold text-slate-900 sm:min-h-12 sm:text-base">{product.name}</h3>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-[#0066CC] sm:text-lg">€{Number(product.price || 0).toFixed(2)}</span>
                    </div>

                    <p className="mt-2 hidden min-h-10 line-clamp-2 text-sm text-slate-500 sm:block">{product.short_description || product.description || 'No product description added yet.'}</p>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:mt-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="font-semibold uppercase tracking-wide text-slate-400">{t('data.sku')}</p>
                        <p className="mt-1 truncate font-semibold text-slate-700">{product.sku}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="font-semibold uppercase tracking-wide text-slate-400">{t('data.inventory')}</p>
                        <div className="mt-1"><Badge variant={productStockVariant(product)} size="sm">{t('data.inStock', { count: product.stock_quantity })}</Badge></div>
                      </div>
                    </div>

                    <div className="mt-3 hidden items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 sm:flex">
                      <span>{product.view_count || 0} {t('data.views')}</span>
                      <span>{product.total_sold || 0} {t('data.sold')}</span>
                      <span>{product.review_count || 0} {t('data.reviews')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 border-t border-slate-100 bg-slate-50/70">
                    <button type="button" onClick={() => setSelectedProductId(product.id)} className="px-2 py-3 text-xs font-bold text-[#0066CC] transition hover:bg-blue-50">
                      {t('data.viewDetails')}
                    </button>
                    <Link href={getProductEditPath(product)} className="border-x border-slate-100 px-2 py-3 text-center text-xs font-bold text-slate-700 transition hover:bg-white hover:text-[#0066CC]">
                      {t('data.edit')}
                    </Link>
                    <button type="button" onClick={() => void handleDeleteProduct(product)} disabled={deletingProductId === product.id} className="px-2 py-3 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                      {deletingProductId === product.id ? t('data.deleting') : t('data.delete')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {selectedProductId && (
          <ProductDetailsModal
            isOpen
            onClose={closeProductDetails}
            productId={selectedProductId}
            onProductUpdate={() => void loadPanelData(true)}
          />
        )}
      </section>
    );
  }

  if (kind === 'orders') {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0066CC]">{t('data.sales')}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Orders</h2>
            <p className="mt-1 text-sm text-slate-500">{t('data.ordersDescription')}</p>
          </div>
          <Link href="/orders" className="inline-flex items-center justify-center rounded-lg border-2 border-[#0066CC] px-4 py-2 text-sm font-semibold text-[#0066CC] transition hover:bg-blue-50">
            {t('data.manageOrders')}
          </Link>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {orders.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-1.5 6h13M9 19.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm10 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>
            </div>
            <h3 className="mt-4 font-bold text-slate-900">{t('data.noOrders')}</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{t('data.noOrdersDescription')}</p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {orders.map((order) => {
              const status = ORDER_STATUS[order.status] || {
                label: order.status.replace(/_/g, ' '),
                variant: 'default' as const,
              };

              return (
                <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#0066CC]/35 hover:shadow-md sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-950">Order #{order.order.order_no}</h3>
                        <Badge variant={status.variant} size="sm">{status.label}</Badge>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-700">{order.order.user.name}</p>
                      <p className="text-sm text-slate-500">{order.order.user.email}</p>
                    </div>
                    <div className="rounded-xl bg-blue-50 px-4 py-3 text-left sm:text-right">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-500">{t('data.orderTotal')}</p>
                      <p className="mt-1 text-xl font-bold text-[#0066CC]">€{Number(order.total || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-y border-slate-100 py-3">
                    {order.items.slice(0, 2).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{item.product_name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">SKU {item.product_sku} · Qty {item.quantity}</p>
                        </div>
                        <span className="shrink-0 font-bold text-slate-800">€{Number(item.line_total || 0).toFixed(2)}</span>
                      </div>
                    ))}
                    {order.items.length > 2 && <p className="pt-1 text-center text-xs font-medium text-slate-500">+{order.items.length - 2} more item{order.items.length - 2 === 1 ? '' : 's'}</p>}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{order.items.length} item{order.items.length === 1 ? '' : 's'}</span>
                      <span>{t('data.delivery')}: €{Number(order.delivery_fee || 0).toFixed(2)}</span>
                      {order.payment_status && <span className="capitalize">{t('data.payment')}: {order.payment_status.replace(/_/g, ' ')}</span>}
                    </div>
                    <button type="button" onClick={() => setSelectedOrderId(order.id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0066CC] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0052a3]">
                      {t('data.viewOrder')}
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {selectedOrderId && (
          <OrderDetailsModal
            isOpen
            onClose={closeOrderDetails}
            orderId={selectedOrderId}
            onOrderUpdate={() => void loadPanelData(true)}
          />
        )}
      </section>
    );
  }

  const metrics = [
    { label: t('data.products'), value: analytics?.total_products || 0, tone: 'bg-blue-50 text-blue-700' },
    { label: t('data.orders'), value: analytics?.total_orders || 0, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Delivered revenue', value: `€${Number(analytics?.total_revenue || 0).toFixed(2)}`, tone: 'bg-amber-50 text-amber-700' },
    { label: t('data.followers'), value: analytics?.total_followers || 0, tone: 'bg-violet-50 text-violet-700' },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0066CC]">{t('data.storePerformance')}</p>
      <h2 className="mt-1 text-xl font-bold text-slate-950">{t('data.analyticsOverview')}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className={`rounded-2xl p-4 ${metric.tone}`}>
            <p className="text-2xl font-bold">{metric.value}</p>
            <p className="mt-1 text-sm font-medium opacity-80">{metric.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
