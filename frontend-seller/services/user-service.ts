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

export interface PasswordChangeCodeResponse {
  email: string;
}

export interface ProfileResponse {
  user: User & {
    phone_verified_at?: string | null;
    profile_image_url?: string | null;
  };
}

export const userService = {
  async getProfile(): Promise<ProfileResponse> {
    const res = await apiClient.get("/seller/profile");
    return res.data.data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<ProfileResponse> {
    const res = await apiClient.put("/seller/profile", payload);
    return res.data.data;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.post("/seller/profile/change-password", payload);
  },

  async sendPasswordChangeCode(): Promise<PasswordChangeCodeResponse> {
    const res = await apiClient.post("/seller/profile/change-password/send-code");
    return res.data.data;
  },

  async verifyPasswordChangeCode(code: string): Promise<void> {
    await apiClient.post("/seller/profile/change-password/verify-code", { code });
  },

  async resetPasswordWithVerifiedCode(password: string, passwordConfirmation: string): Promise<void> {
    await apiClient.post("/seller/profile/change-password/reset", {
      password,
      password_confirmation: passwordConfirmation,
    });
  },

  async uploadProfileImage(file: File): Promise<ProfileResponse> {
    const formData = new FormData();
    formData.append("image", file);
    const res = await apiClient.post("/seller/profile/upload-image", formData);
    return res.data.data;
  },

  async deleteProfileImage(): Promise<ProfileResponse> {
    const res = await apiClient.delete("/seller/profile/image");
    return res.data.data;
  },

  /**
   * Changes the login email while it is still unverified. The backend rejects
   * this once the address has been verified.
   */
  async changeEmail(email: string): Promise<{ user?: User; dispatched: boolean }> {
    const res = await apiClient.post("/seller/profile/change-email", { email });
    return {
      user: res.data?.data?.user as User | undefined,
      dispatched: res.data?.data?.verification_dispatched !== false,
    };
  },

  async sendEmailVerification(): Promise<void> {
    await apiClient.post("/seller/profile/verify-email/send");
  },

  async verifyEmail(): Promise<void> {
    await apiClient.post("/seller/profile/verify-email");
  },

  async sendPhoneVerification(): Promise<void> {
    await apiClient.post("/seller/profile/verify-phone/send");
  },

  async verifyPhone(): Promise<void> {
    await apiClient.post("/seller/profile/verify-phone");
  },

  async deleteAccount(password: string): Promise<void> {
    await apiClient.delete("/seller/profile", { data: { password } });
  },
};

