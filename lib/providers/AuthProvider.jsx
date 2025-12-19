'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/store';
import { usePathname, useRouter } from 'next/navigation';

// Pages that don't require authentication
const PUBLIC_PATHS = ['/login', '/forgot-password'];

/**
 * Auth Provider Component
 * - Loads user on app start
 * - Redirects to login if not authenticated
 * - Redirects to dashboard if authenticated and on public page
 */
export function AuthProvider({ children }) {
  const { loadUser, isAuthenticated, isLoading } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  // Load user when app starts
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Handle redirects based on auth status
  useEffect(() => {
    if (!isLoading) {
      const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));
      
      // If not authenticated and trying to access protected route
      if (!isAuthenticated && !isPublicPath) {
        router.push('/login');
      } 
      // If authenticated and on login/register page
      else if (isAuthenticated && isPublicPath) {
        router.push('/home');
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}