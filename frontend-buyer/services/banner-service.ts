import apiClient from '@/lib/api-client';

export interface PublicBanner {
  id: number;
  title?: string | null;
  link?: string | null;
  position: 'top' | 'middle' | 'bottom' | 'sidebar';
  sort_order: number;
  image: string;
  image_url?: string | null;
}

export const bannerService = {
  async getPublicBanners(params?: { position?: 'top' | 'middle' | 'bottom' | 'sidebar'; limit?: number }): Promise<PublicBanner[]> {
    const res = await apiClient.get('/banners', { params });
    return res.data?.data?.banners || [];
  },
};
