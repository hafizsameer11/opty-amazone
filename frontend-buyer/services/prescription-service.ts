import apiClient from '@/lib/api-client';

export interface Prescription {
  id: number;
  user_id: number;
  prescription_type: 'single_vision' | 'bifocal' | 'trifocal' | 'progressive';
  od_sphere?: number;
  od_cylinder?: number;
  od_axis?: number;
  od_add?: number;
  os_sphere?: number;
  os_cylinder?: number;
  os_axis?: number;
  os_add?: number;
  pd_binocular?: number;
  pd_monocular_od?: number;
  pd_monocular_os?: number;
  pd_near?: number;
  ph_od?: number;
  ph_os?: number;
  doctor_name?: string;
  doctor_license?: string;
  prescription_date?: string;
  expiry_date?: string;
  notes?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePrescriptionData {
  prescription_type: 'single_vision' | 'bifocal' | 'trifocal' | 'progressive';
  od_sphere?: number;
  od_cylinder?: number;
  od_axis?: number;
  od_add?: number;
  os_sphere?: number;
  os_cylinder?: number;
  os_axis?: number;
  os_add?: number;
  pd_binocular?: number;
  pd_monocular_od?: number;
  pd_monocular_os?: number;
  pd_near?: number;
  ph_od?: number;
  ph_os?: number;
  doctor_name?: string;
  doctor_license?: string;
  prescription_date?: string;
  expiry_date?: string;
  notes?: string;
  is_active?: boolean;
  is_verified?: boolean;
}

export const prescriptionService = {
  async getAll(): Promise<Prescription[]> {
    const res = await apiClient.get('/buyer/prescriptions');
    return res.data.data;
  },

  async getById(id: number): Promise<Prescription> {
    const res = await apiClient.get(`/buyer/prescriptions/${id}`);
    return res.data.data;
  },

  async create(data: CreatePrescriptionData): Promise<Prescription> {
    const res = await apiClient.post('/buyer/prescriptions', data);
    return res.data.data;
  },

  async update(id: number, data: Partial<CreatePrescriptionData>): Promise<Prescription> {
    const res = await apiClient.put(`/buyer/prescriptions/${id}`, data);
    return res.data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/buyer/prescriptions/${id}`);
  },
};

