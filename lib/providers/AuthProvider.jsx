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

  // Load user when app starts (only once)
  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Safety timeout: If loading takes too long, force it to stop
  useEffect(() => {
    if (!isLoading) return;
    
    const safetyTimeout = setTimeout(() => {
      console.warn('Auth loading timeout - forcing loading to false');
      // Force loading to stop after 15 seconds
      if (isLoading) {
        // Check if we have a token to use as fallback
        const token = typeof document !== 'undefined' ? document.cookie.split('; ').find(row => row.startsWith('auth_token=')) : null;
        if (!token) {
          // No token, redirect to login
          router.push('/login');
        }
      }
    }, 15000); // 15 second safety timeout

    return () => clearTimeout(safetyTimeout);
  }, [isLoading, router]);

  // Handle redirects based on auth status
  useEffect(() => {
    // Don't redirect while loading or if pathname is not yet available
    if (isLoading || !pathname) {
      return;
    }

    const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));
    
    // If not authenticated and trying to access protected route
    if (!isAuthenticated && !isPublicPath) {
      router.push('/login');
      return;
    } 
    
    // If authenticated and on login/register page, redirect to dispatch-orders
    // Only redirect if we're actually on a public auth page
    if (isAuthenticated && isPublicPath) {
      router.push('/dispatch-orders');
      return;
    }
    
    // Don't redirect if user is authenticated and on a protected route
    // Let them access the route they requested
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