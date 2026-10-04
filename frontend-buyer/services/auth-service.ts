import apiClient from '@/lib/api-client';
import type {
  AuthResponse,
  RegisterData,
  LoginData,
  ForgotPasswordData,
  ResetPasswordData,
  VerifyResetCodeResponse,
  ApiError,
} from '@/types/auth';

export class AuthService {
  /**
   * Register a new buyer
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/buyer/auth/register', data);
    return response.data;
  }

  /**
   * Login buyer
   */
  static async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/buyer/auth/login', data);
    return response.data;
  }

  /**
   * Logout buyer
   */
  static async logout(token?: string | null): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/buyer/auth/logout', undefined, token ? {
      headers: { Authorization: `Bearer ${token}` },
    } : undefined);
    return response.data;
  }

  /**
   * Request a password reset verification code
   */
  static async forgotPassword(data: ForgotPasswordData): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/buyer/auth/forgot-password', data);
    return response.data;
  }

  /**
   * Exchange a verification code for a short-lived reset token
   */
  static async verifyPasswordResetCode(email: string, code: string): Promise<{ reset_token: string }> {
    const response = await apiClient.post<VerifyResetCodeResponse>('/buyer/auth/verify-reset-code', { email, code });
    return response.data.data;
  }

  /**
   * Reset password using a verified reset token
   */
  static async resetPassword(data: ResetPasswordData): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/buyer/auth/reset-password', data);
    return response.data;
  }

  /**
   * Store auth token and user data
   */
  static setAuth(token: string, user: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  /**
   * Get stored auth token
   */
  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  /**
   * Get stored user data
   */
  static getUser(): any | null {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  /**
   * Clear auth data
   */
  static clearAuth(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
}
