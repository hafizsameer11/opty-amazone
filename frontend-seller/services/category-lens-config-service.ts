import apiClient from '@/lib/api-client';

export interface CategoryLensConfig {
  id: number;
  name: string;
  slug: string;
  lens_types: number[];
  lens_treatments: number[];
  lens_coatings: number[];
  lens_thickness_materials: number[];
  lens_thickness_options: number[];
}

export interface CategoryLensConfigDetail {
  category: {
    id: number;
    name: string;
    slug: string;
  };
  available: {
    lens_types: Array<{
      id: number;
      name: string;
      slug: string;
      index: number;
      price_adjustment: number;
      is_active: boolean;
    }>;
    treatments: Array<{
      id: number;
      name: string;
      slug: string;
      type: string;
      price: number;
      is_active: boolean;
    }>;
    coatings: Array<{
      id: number;
      name: string;
      slug: string;
      type: string;
      price_adjustment: number;
      is_active: boolean;
    }>;
    thickness_materials: Array<{
      id: number;
      name: string;
      slug: string;
      price: number;
      is_active: boolean;
    }>;
    thickness_options: Array<{
      id: number;
      name: string;
      slug: string;
      thickness_value: number;
      is_active: boolean;
    }>;
  };
  configured: {
    lens_types: number[];
    treatments: number[];
    coatings: number[];
    thickness_materials: number[];
    thickness_options: number[];
  };
}

export interface UpdateCategoryLensConfigData {
  lens_type_ids?: number[];
  lens_treatment_ids?: number[];
  lens_coating_ids?: number[];
  lens_thickness_material_ids?: number[];
  lens_thickness_option_ids?: number[];
}

export const categoryLensConfigService = {
  /**
   * Get all category configurations for the seller's store.
   */
  async getCategoryConfigs(): Promise<CategoryLensConfig[]> {
    const res = await apiClient.get('/seller/category-lens-config');
    return res.data.data;
  },

  /**
   * Get lens configuration for a specific category.
   */
  async getCategoryConfig(categoryId: number): Promise<CategoryLensConfigDetail> {
    const res = await apiClient.get(`/seller/category-lens-config/${categoryId}`);
    return res.data.data;
  },

  /**
   * Update lens configuration for a specific category.
   */
  async updateCategoryConfig(
    categoryId: number,
    config: UpdateCategoryLensConfigData
  ): Promise<void> {
    await apiClient.put(`/seller/category-lens-config/${categoryId}`, config);
  },
};

