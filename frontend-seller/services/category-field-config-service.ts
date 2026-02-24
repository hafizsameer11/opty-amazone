import apiClient from '@/lib/api-client';

export interface CategoryFieldConfig {
  id: number;
  name: string;
  slug: string;
  product_type: string;
  field_config: Record<string, boolean>;
}

export interface CategoryFieldConfigDetail {
  category: {
    id: number;
    name: string;
    slug: string;
  };
  product_type: string;
  available_fields: string[];
  field_config: Record<string, boolean>;
}

export interface CategoryFieldsForForm {
  category_id: number;
  category_slug: string;
  product_type: string;
  enabled_fields: string[];
  field_config: Record<string, boolean>;
  pd_options?: string[] | null;
}

export interface UpdateCategoryFieldConfigData {
  field_config: Record<string, boolean>;
}

export const categoryFieldConfigService = {
  /**
   * Get all category field configurations for the seller's store.
   */
  async getAll(): Promise<CategoryFieldConfig[]> {
    const res = await apiClient.get('/seller/category-field-configs');
    return res.data.data;
  },

  /**
   * Get field configuration for a specific category.
   */
  async getOne(categoryId: number): Promise<CategoryFieldConfigDetail> {
    const res = await apiClient.get(`/seller/category-field-configs/${categoryId}`);
    return res.data.data;
  },

  /**
   * Update field configuration for a specific category.
   */
  async update(
    categoryId: number,
    config: UpdateCategoryFieldConfigData
  ): Promise<void> {
    await apiClient.put(`/seller/category-field-configs/${categoryId}`, config);
  },

  /**
   * Get enabled fields for a category (used by product creation form).
   */
  async getFieldsForCategory(categoryId: number): Promise<CategoryFieldsForForm> {
    const res = await apiClient.get(`/seller/category-field-configs/${categoryId}/fields`);
    return res.data.data;
  },
};
