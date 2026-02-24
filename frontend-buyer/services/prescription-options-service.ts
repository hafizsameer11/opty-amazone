import apiClient from '@/lib/api-client';

export interface PrescriptionOptions {
  pd: string[];
  sph: {
    left: string[];
    right: string[];
    both: string[];
  };
  cyl: {
    left: string[];
    right: string[];
    both: string[];
  };
  axis: {
    left: string[];
    right: string[];
    both: string[];
  };
  h: string[];
  year_of_birth: string[];
  add: string[];
  base_curve: string[];
  diameter: string[];
}

/**
 * Get prescription options for a product based on its category.
 * Returns empty arrays if no configuration exists.
 */
export async function getPrescriptionOptions(productId: number): Promise<PrescriptionOptions> {
  try {
    const response = await apiClient.get<{ success: boolean; data: PrescriptionOptions }>(
      `/prescription-options/product/${productId}`
    );
    return response.data.data;
  } catch (error: any) {
    console.error('Failed to fetch prescription options:', error);
    // Return empty structure if API fails
    return {
      pd: [],
      sph: { left: [], right: [], both: [] },
      cyl: { left: [], right: [], both: [] },
      axis: { left: [], right: [], both: [] },
      h: [],
      year_of_birth: [],
      add: [],
      base_curve: [],
      diameter: [],
    };
  }
}






