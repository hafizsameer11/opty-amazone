'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '@/services/auth-service';
import type { User, LoginData, RegisterData } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  completeEmailVerification: (verifiedUser: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore browser storage after hydration, without changing the server
    // render synchronously inside this effect.
    let active = true;
    const frame = window.requestAnimationFrame(() => {
      if (!active) return;
      const storedUser = AuthService.getUser();
      if (storedUser && AuthService.isAuthenticated()) setUser(storedUser);
      setLoading(false);
    });
    return () => { active = false; window.cancelAnimationFrame(frame); };
  }, []);

  const login = async (data: LoginData) => {
    const response = await AuthService.login(data);
    AuthService.setAuth(response.data.token, response.data.user);
    setUser(response.data.user);
    return response.data.user;
  };

  const register = async (data: RegisterData) => {
    const response = await AuthService.register(data);
    AuthService.setAuth(response.data.token, response.data.user);
    setUser(response.data.user);
    return response.data.user;
  };

  const logout = async () => {
    // Clear the client session before contacting the API so navigation and
    // all dependent providers update immediately even if the network is slow.
    const token = AuthService.getToken();
    AuthService.clearAuth();
    setUser(null);

    try {
      await AuthService.logout(token);
    } catch {
      // Even if API call fails, clear local storage
    }
  };

  const completeEmailVerification = (verifiedUser: User) => {
    const token = AuthService.getToken();
    if (token) AuthService.setAuth(token, verifiedUser);
    setUser(verifiedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        completeEmailVerification,
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
