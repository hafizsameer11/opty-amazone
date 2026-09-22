export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'buyer' | 'seller' | 'admin';
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  /** Collected by the registration form for the verification flow. */
  verification_code?: string;
  password: string;
  password_confirmation: string;
  referral_attribution_token?: string;
  referral_code?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  password: string;
  password_confirmation: string;
  token: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
