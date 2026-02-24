import apiClient from '@/lib/api-client';
import { getPrescriptionOptions, type PrescriptionOptions } from './prescription-options-service';

export interface LensType {
  id: number;
  name: string;
  slug: string;
  description?: string;
  index: number;
  thickness_factor?: number;
  price_adjustment: number;
  is_active: boolean;
}

export interface LensTreatment {
  id: number;
  name: string;
  slug: string;
  type: string;
  description?: string;
  price: number;
  icon?: string;
  is_active: boolean;
  sort_order: number;
}

export interface LensCoating {
  id: number;
  name: string;
  slug: string;
  type: string;
  description?: string;
  price_adjustment: number;
  is_active: boolean;
}

export interface LensThicknessMaterial {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  is_active: boolean;
  sort_order: number;
}

export interface LensThicknessOption {
  id: number;
  name: string;
  slug: string;
  description?: string;
  thickness_value?: number;
  is_active: boolean;
  sort_order: number;
}

export interface ProgressiveVariant {
  id: number;
  prescription_lens_type_id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  is_recommended?: boolean;
  viewing_range?: string;
  use_cases?: string;
  is_active: boolean;
  sort_order: number;
}

export const lensDataService = {
  async getLensTypes(): Promise<LensType[]> {
    const res = await apiClient.get('/lens/types');
    return res.data.data;
  },

  async getLensTreatments(): Promise<LensTreatment[]> {
    const res = await apiClient.get('/lens/treatments');
    return res.data.data;
  },

  async getLensCoatings(): Promise<LensCoating[]> {
    const res = await apiClient.get('/lens/coatings');
    return res.data.data;
  },

  async getThicknessMaterials(): Promise<LensThicknessMaterial[]> {
    const res = await apiClient.get('/lens/thickness-materials');
    return res.data.data;
  },

  async getThicknessOptions(): Promise<LensThicknessOption[]> {
    const res = await apiClient.get('/lens/thickness-options');
    return res.data.data;
  },

  async getProgressiveVariants(typeId: number): Promise<ProgressiveVariant[]> {
    try {
      const res = await apiClient.get(`/lens/prescription-lens-types/${typeId}/variants`);
      return res.data.data || [];
    } catch (error) {
      console.error('Failed to fetch progressive variants:', error);
      return [];
    }
  },

  /**
   * Get lens configuration for a product based on its category.
   * Returns category-specific lens options if configured, otherwise returns global options.
   * Also includes prescription options.
   */
  async getLensConfigForProduct(productId: number): Promise<{
    lens_types: LensType[];
    treatments: LensTreatment[];
    coatings: LensCoating[];
    thickness_materials: LensThicknessMaterial[];
    thickness_options: LensThicknessOption[];
    prescription_options?: PrescriptionOptions;
    source: 'category' | 'global';
  }> {
    try {
      const res = await apiClient.get(`/lens/product/${productId}/config`);
      const config = res.data.data;
      
      // Fetch prescription options separately
      const prescriptionOptions = await getPrescriptionOptions(productId);
      
      return {
        ...config,
        prescription_options: prescriptionOptions,
      };
    } catch (error) {
      console.error('Failed to fetch product lens config, falling back to global:', error);
      // Fallback to global options
      const [lensTypes, treatments, coatings, materials, options] = await Promise.all([
        this.getLensTypes(),
        this.getLensTreatments(),
        this.getLensCoatings(),
        this.getThicknessMaterials(),
        this.getThicknessOptions(),
      ]);
      
      // Still fetch prescription options even on fallback
      const prescriptionOptions = await getPrescriptionOptions(productId);
      
      return {
        lens_types: lensTypes,
        treatments,
        coatings,
        thickness_materials: materials,
        thickness_options: options,
        prescription_options: prescriptionOptions,
        source: 'global',
      };
    }
  },
};

