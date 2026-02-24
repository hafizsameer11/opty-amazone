import apiClient from '@/lib/api-client';

export interface PrescriptionDropdownValue {
  id: number;
  store_id: number;
  category_id: number;
  field_type: 'sph' | 'cyl' | 'axis' | 'pd' | 'h' | 'year_of_birth' | 'add' | 'base_curve' | 'diameter';
  value: string;
  label?: string;
  eye_type?: 'left' | 'right' | 'both';
  form_type?: 'distance_vision' | 'near_vision' | 'progressive' | 'contact_lens';
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CategoryPrescriptionConfig {
  id: number;
  name: string;
  slug: string;
  has_config: boolean;
  config_status: {
    sph: boolean;
    cyl: boolean;
    axis: boolean;
    pd: boolean;
    h: boolean;
    year_of_birth: boolean;
    add: boolean;
    base_curve: boolean;
    diameter: boolean;
  };
}

// Alias for backward compatibility
export type CategoryPrescriptionConfigWithStatus = CategoryPrescriptionConfig;

export interface CategoryPrescriptionConfigDetail {
  category: {
    id: number;
    name: string;
    slug: string;
  };
  values: {
    sph: PrescriptionDropdownValue[];
    cyl: PrescriptionDropdownValue[];
    axis: PrescriptionDropdownValue[];
    pd: PrescriptionDropdownValue[];
    h: PrescriptionDropdownValue[];
    year_of_birth: PrescriptionDropdownValue[];
    add: PrescriptionDropdownValue[];
    base_curve: PrescriptionDropdownValue[];
    diameter: PrescriptionDropdownValue[];
  };
}

export interface UpdatePrescriptionConfigData {
  values: Array<{
    field_type: PrescriptionDropdownValue['field_type'];
    value: string;
    label?: string;
    eye_type?: PrescriptionDropdownValue['eye_type'];
    form_type?: PrescriptionDropdownValue['form_type'];
    is_active?: boolean;
    sort_order?: number;
  }>;
}

/**
 * Get all categories with their prescription config status
 */
export async function getCategoryConfigs(): Promise<CategoryPrescriptionConfig[]> {
  const response = await apiClient.get<{ success: boolean; data: CategoryPrescriptionConfig[] }>(
    '/seller/prescription-dropdowns'
  );
  return response.data.data;
}

/**
 * Get prescription dropdown values for a specific category
 */
export async function getCategoryConfig(categoryId: number): Promise<CategoryPrescriptionConfigDetail> {
  const response = await apiClient.get<{ success: boolean; data: CategoryPrescriptionConfigDetail }>(
    `/seller/prescription-dropdowns/${categoryId}`
  );
  return response.data.data;
}

/**
 * Update prescription dropdown values for a category (bulk upsert)
 */
export async function updateCategoryConfig(
  categoryId: number,
  data: UpdatePrescriptionConfigData
): Promise<void> {
  await apiClient.post(`/seller/prescription-dropdowns/${categoryId}`, data);
}

/**
 * Delete a prescription dropdown value
 */
export async function deleteValue(id: number): Promise<void> {
  await apiClient.delete(`/seller/prescription-dropdowns/${id}`);
}

