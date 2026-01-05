import { create } from 'zustand';
import { authService } from '../lib/api/services/auth';
/**
 * Zustand Store for Authentication
 * This is like a global variable that all components can access
 */
export const useAuthStore = create((set, get) => ({
  // Initial state
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  /**
   * Login user
   */
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login({ email, password });
      
      // Check if user has CRM portal access
      const portalAccess = response.user?.portalAccess || [];
      if (!portalAccess.includes('crm')) {
        // Clear any token that might have been set
        authService.logout();
        const errorMessage = 'Access denied. This account does not have permission to access the CRM dashboard.';
        set({ 
          isLoading: false, 
          error: errorMessage,
          user: null,
          isAuthenticated: false
        });
        throw new Error(errorMessage);
      }
      
      set({ 
        user: response.user, 
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.message || 'Login failed'
      });
      throw error;
    }
  },

  /**
   * Register new user
   */
  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(data);
      set({ 
        user: response.user, 
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.message || 'Registration failed'
      });
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: () => {
    authService.logout();
    set({ 
      user: null, 
      isAuthenticated: false,
      error: null
    });
  },

  /**
   * Load current user from token (OPTIMIZED HYBRID APPROACH)
   * 1. First, decode JWT from cookie for instant load (no API call)
   * 2. Then, optionally refresh from API in background for accuracy
   */
  loadUser: async (forceRefresh = false) => {
    // Check if token exists
    if (!authService.isAuthenticated()) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    // STEP 1: Load user from JWT token (INSTANT - no API call)
    const decodedToken = authService.getDecodedToken();
    
    if (decodedToken && !forceRefresh) {
      // Check if user role indicates they shouldn't have CRM access
      // Supplier, distributor, and buyer roles should not access CRM
      const restrictedRoles = ['supplier', 'distributor', 'buyer'];
      if (restrictedRoles.includes(decodedToken.role)) {
        // User with restricted role trying to access CRM - logout
        authService.logout();
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      
      // Set user immediately from token
      set({ 
        user: {
          id: decodedToken.id,
          name: decodedToken.name,
          email: decodedToken.email,
          role: decodedToken.role,
          permissions: decodedToken.permissions || []
        },
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      // STEP 2 (Optional): Refresh from API in background
      // This ensures data is fresh without blocking UI
      get().refreshUserInBackground();
      return;
    }

    // STEP 3: If forceRefresh or no decoded token, call API
    set({ isLoading: true });
    try {
      const user = await authService.getCurrentUser();
      
      // Check if user has CRM portal access
      const portalAccess = user?.portalAccess || [];
      if (!portalAccess.includes('crm')) {
        // User doesn't have CRM access - logout
        authService.logout();
        set({ 
          user: null, 
          isAuthenticated: false,
          isLoading: false,
          error: 'Access denied. This account does not have permission to access the CRM dashboard.'
        });
        return;
      }
      
      set({ 
        user, 
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error) {
      authService.logout();
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false,
        error: error.message || 'Failed to load user'
      });
    }
  },

  /**
   * Refresh user data from API in background (no loading state)
   * Use this to silently update user data without blocking UI
   */
  refreshUserInBackground: async () => {
    try {
      const user = await authService.getCurrentUser();
      
      // Check if user has CRM portal access
      const portalAccess = user?.portalAccess || [];
      if (!portalAccess.includes('crm')) {
        // User lost CRM access - logout
        authService.logout();
        set({ 
          user: null, 
          isAuthenticated: false,
          error: 'Access denied. This account does not have permission to access the CRM dashboard.'
        });
        return;
      }
      
      // Only update if user is still authenticated
      if (get().isAuthenticated) {
        set({ user, error: null });
      }
    } catch (error) {
      // Silently fail - don't log out user on background refresh failure
      console.warn('Background user refresh failed:', error.message);
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Check if user has specific permission
   */
  hasPermission: (permission) => {
    const { user } = get();
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'super-admin') return true;
    
    return user.permissions?.includes(permission);
  },

  /**
   * Check if user has specific role
   */
  hasRole: (role) => {
    const { user } = get();
    if (!user) return false;
    
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  },

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission: (permissions) => {
    const { user } = get();
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'super-admin') return true;
    
    return permissions.some(permission => user.permissions?.includes(permission));
  }
}));