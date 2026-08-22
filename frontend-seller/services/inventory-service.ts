import apiClient from '@/lib/api-client';

export interface LowStockResponse {
  threshold: number;
  count: number;
  products: Array<{
    id: number;
    name: string;
    sku: string;
    stock_quantity: number;
    stock_status: string;
    product_type: string;
  }>;
}

export const inventoryService = {
  async getLowStock(): Promise<LowStockResponse> {
    const res = await apiClient.get('/seller/inventory/low-stock');
    return res.data.data as LowStockResponse;
  },
};
