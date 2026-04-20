'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService } from '@/services/auth';
import { User } from '@/types/types';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userData = await authService.getMe();
      
      // Enrich user data with real names and profile pictures based on role
      const role = userData.role_name?.toLowerCase();
      if (role === 'admin') {
        userData.full_name = "Mohamed Essaaidi";
        userData.profile_image = "/PRF-PIC/Admin.png";
      } else if (role === 'professor') {
        userData.full_name = "Meriem Timouyas";
        userData.profile_image = "/PRF-PIC/Prof.png";
      } else {
        userData.full_name = "ISMEG ZAKARIA";
        userData.profile_image = "/PRF-PIC/Student.webp";
      }
      
      setUser(userData);
      
      // If we are on the login page and have a user, redirect to dashboard
      if (pathname === '/') {
        if (role === 'admin') router.push('/dashboard/admin');
        else if (role === 'professor') router.push('/dashboard/professor');
        else router.push('/dashboard');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await authService.login(email, password);
      const userData = await authService.getMe();
      
      // Enrich user data with real names and profile pictures based on role
      const role = userData.role_name?.toLowerCase();
      if (role === 'admin') {
        userData.full_name = "Mohamed Essaaidi";
        userData.profile_image = "/PRF-PIC/Admin.png";
      } else if (role === 'professor') {
        userData.full_name = "Meriem Timouyas";
        userData.profile_image = "/PRF-PIC/Prof.png";
      } else {
        userData.full_name = "ISMEG ZAKARIA";
        userData.profile_image = "/PRF-PIC/Student.webp";
      }
      
      setUser(userData);
      
      // Redirect based on role
      if (role === 'admin') router.push('/dashboard/admin');
      else if (role === 'professor') router.push('/dashboard/professor');
      else router.push('/dashboard');
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
