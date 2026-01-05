'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { AlertCircle } from 'lucide-react';


/**
 * Protected Route Component
 * Wraps pages that require authentication and/or specific permissions
 * 
 * @example
 * <ProtectedRoute requiredPermissions={['users']}>
 *   <UsersPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ 
  children, 
  requiredPermissions = [],
  requiredRoles = [],
  fallback
}) {
  const { isAuthenticated, hasPermission, hasRole, hasAnyPermission, user, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Wait for loading to complete
    if (isLoading) return;

    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check role requirements
    if (user && requiredRoles.length > 0 && !hasRole(requiredRoles)) {
      router.push('/unauthorized');
      return;
    }

    // Check permission requirements (user must have ALL specified permissions)
    if (user && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every(permission => 
        hasPermission(permission)
      );
      
      if (!hasAllPermissions) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, user, isLoading, requiredPermissions, requiredRoles, hasPermission, hasRole, router]);

  // Show loading state
  if (isLoading) {
    return fallback || (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show nothing if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Check permissions before rendering
  if (user && requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    );
    
    if (!hasAllPermissions) {
      return null;
    }
  }

  // Render children if all checks pass
  return <>{children}</>;
}