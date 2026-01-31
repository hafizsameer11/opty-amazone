import { apiClient } from "../lib/api-client";
import type { User } from "../types/auth";

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  phone?: string | null;
}

export interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface AddressPayload {
  id?: number;
  type?: string;
  full_name: string;
  phone?: string | null;
  address_line_1: string;
  address_line_2?: string | null;
  country_id?: number | null;
  state_id?: number | null;
  city_id?: number | null;
  postal_code?: string | null;
  is_default?: boolean;
}

export interface Address extends AddressPayload {
  id: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileResponse {
  user: User & {
    phone_verified_at?: string | null;
    profile_image_url?: string | null;
  };
}

export const userService = {
  async getProfile(): Promise<ProfileResponse> {
    const res = await apiClient.get("/buyer/profile");
    return res.data.data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<ProfileResponse> {
    const res = await apiClient.put("/buyer/profile", payload);
    return res.data.data;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.post("/buyer/profile/change-password", payload);
  },

  async uploadProfileImage(file: File): Promise<ProfileResponse> {
    const formData = new FormData();
    formData.append("image", file);
    const res = await apiClient.post("/buyer/profile/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  async deleteProfileImage(): Promise<ProfileResponse> {
    const res = await apiClient.delete("/buyer/profile/image");
    return res.data.data;
  },

  async sendEmailVerification(): Promise<void> {
    await apiClient.post("/buyer/profile/verify-email/send");
  },

  async verifyEmail(): Promise<void> {
    await apiClient.post("/buyer/profile/verify-email");
  },

  async sendPhoneVerification(): Promise<void> {
    await apiClient.post("/buyer/profile/verify-phone/send");
  },

  async verifyPhone(): Promise<void> {
    await apiClient.post("/buyer/profile/verify-phone");
  },

  async deleteAccount(password: string): Promise<void> {
    await apiClient.delete("/buyer/profile", { data: { password } });
  },

  async getAddresses(): Promise<Address[]> {
    const res = await apiClient.get("/buyer/addresses");
    return res.data.data;
  },

  async getAddress(id: number): Promise<Address> {
    const res = await apiClient.get(`/buyer/addresses/${id}`);
    return res.data.data;
  },

  async createAddress(payload: AddressPayload): Promise<Address> {
    const res = await apiClient.post("/buyer/addresses", payload);
    return res.data.data;
  },

  async updateAddress(id: number, payload: AddressPayload): Promise<Address> {
    const res = await apiClient.put(`/buyer/addresses/${id}`, payload);
    return res.data.data;
  },

  async deleteAddress(id: number): Promise<void> {
    await apiClient.delete(`/buyer/addresses/${id}`);
  },

  async setDefaultAddress(id: number): Promise<Address> {
    const res = await apiClient.post(`/buyer/addresses/${id}/set-default`);
    return res.data.data;
  },
};

