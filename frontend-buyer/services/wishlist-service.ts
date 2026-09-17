import apiClient from '@/lib/api-client';

export interface WishlistItem { id: number; created_at: string; product: any; }
export const wishlistService = {
  async list(params?: { page?: number; per_page?: number }) { const r=await apiClient.get('/buyer/wishlist',{params}); return r.data.data as {items: WishlistItem[]; pagination: any}; },
  async save(productId:number) { const r=await apiClient.post(`/buyer/wishlist/${productId}`); return r.data.data; },
  async remove(productId:number) { return apiClient.delete(`/buyer/wishlist/${productId}`); },
  async status(productId:number) { const r=await apiClient.get(`/buyer/wishlist/${productId}/status`); return Boolean(r.data.data?.is_saved); },
};
