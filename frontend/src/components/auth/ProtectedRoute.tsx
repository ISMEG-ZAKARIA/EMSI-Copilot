'use client';

import { useAuth } from '@/hooks/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (allowedRoles && !allowedRoles.includes(user.role_name || '')) {
        // Redirect to their own dashboard if they try to access unauthorized role page
        const role = user.role_name?.toLowerCase();
        if (role === 'admin') router.push('/dashboard/admin');
        else if (role === 'professor') router.push('/dashboard/professor');
        else router.push('/dashboard');
      }
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1117] text-white">
        <div className="animate-pulse text-xl font-bold text-[#2ea043]">Chargement...</div>
      </div>
    );
  }

  if (!user || (allowedRoles && !allowedRoles.includes(user.role_name || ''))) {
    return null;
  }

  return <>{children}</>;
}
