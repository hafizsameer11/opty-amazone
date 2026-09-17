import apiClient from '@/lib/api-client';

export interface SponsoredAd {
  product: { id: number; name: string; images: string[] | null; price: number | string };
  tracking_token: string; placement: string; label: string;
}
export const adService = {
  async delivery(placement: string, categoryId?: number, query?: string, excludeProductId?: number): Promise<SponsoredAd[]> {
    return (await apiClient.get('/buyer/ads', { params: { placement, category_id: categoryId, query: query || undefined, exclude_product_id: excludeProductId } })).data.data;
  },
  async event(token: string, type: 'impression' | 'click' | 'product_view', productId?: number): Promise<boolean> {
    return Boolean((await apiClient.post('/buyer/ads/events', { tracking_token: token, type, product_id: productId }, { timeout: 5000 })).data.data.accepted);
  },
};
export function rememberAd(productId: number, token: string) {
  try { sessionStorage.setItem('ad:' + productId, JSON.stringify({ token, expires: Date.now() + 7 * 86400000 })); } catch { /* Storage may be unavailable. */ }
}
export function adToken(productId: number): string | undefined {
  try {
    const stored = JSON.parse(sessionStorage.getItem('ad:' + productId) || 'null');
    return stored?.expires > Date.now() ? stored.token : undefined;
  } catch { return undefined; }
}
