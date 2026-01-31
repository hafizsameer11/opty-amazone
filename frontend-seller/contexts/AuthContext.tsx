'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '@/services/auth-service';
import type { User, LoginData, RegisterData } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = AuthService.getUser();
    if (storedUser && AuthService.isAuthenticated()) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (data: LoginData) => {
    try {
      const response = await AuthService.login(data);
      AuthService.setAuth(response.data.token, response.data.user);
      setUser(response.data.user);
    } catch (error: any) {
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await AuthService.register(data);
      AuthService.setAuth(response.data.token, response.data.user);
      setUser(response.data.user);
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      // Even if API call fails, clear local storage
    } finally {
      AuthService.clearAuth();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
