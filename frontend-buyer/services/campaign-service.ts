import api from '@/lib/api-client';

export type AppliedDiscountCampaign = {
  id: number;
  name: string;
  discount_amount: number;
  /** Canonical UTC instant supplied by the pricing service. */
  ends_at: string;
};

export type CampaignPrice = {
  original_price: number;
  discounted_price: number;
  discount_amount: number;
  discount_percentage: number;
  campaign_id: number | null;
  campaign_name: string | null;
  applied_campaign?: AppliedDiscountCampaign | null;
  campaigns: AppliedDiscountCampaign[];
};
export type Placement = 'homepage_hero' | 'homepage_featured' | 'category_page' | 'store_page' | 'sidebar';
export type CampaignBanner = { id: number; name: string; placement: Placement; destination: string; tracking_token: string; creative: { desktop_url: string; mobile_url: string; title: string; description?: string; alt_text: string; cta_text: string } };
export function campaignVisitor(): string {
  const key = 'commerce_campaign_visitor'; let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); } return id;
}
export const campaignService = {
  async price(productId: number, selection: Record<string, unknown>, quantity = 1): Promise<CampaignPrice> {
    return (await api.post(`/buyer/campaigns/products/${productId}/price`, { selection, quantity })).data.data;
  },
  async banners(placement: Placement, categoryId?: number, storeId?: number): Promise<CampaignBanner[]> {
    return (await api.get(`/buyer/campaigns/banners/${placement}`, { params: { category_id: categoryId, store_id: storeId }, headers: { 'X-Campaign-Visitor': campaignVisitor() } })).data.data;
  },
  async event(token: string, type: 'impression' | 'click') {
    await api.post('/buyer/campaigns/banner-events', { tracking_token: token, type }, { headers: { 'X-Campaign-Visitor': campaignVisitor() } });
    if (type === 'click') localStorage.setItem('commerce_campaign_click',token);
  },
};
