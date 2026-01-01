import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';



/**
 * Get authentication token from cookies (server-side)
 */
export function getServerToken() {
  const cookieStore = cookies();
  return cookieStore.get('auth_token')?.value;
}

/**
 * Verify if token is valid and not expired
 */
export function verifyToken(token) {
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  } catch {
    return false;
  }
}

/**
 * Decode JWT token and return user data
 */
export function decodeToken(token) {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(token, permission) {
  const decoded = decodeToken(token);
  if (!decoded) return false;
  
  // Admin has all permissions
  if (decoded.role === 'super-admin') return true;
  
  return decoded.permissions.includes(permission);
}

/**
 * Check if user has specific role
 */
export function hasRole(token, roles) {
  const decoded = decodeToken(token);
  if (!decoded) return false;
  
  if (Array.isArray(roles)) {
    return roles.includes(decoded.role);
  }
  return decoded.role === roles;
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(token, permissions) {
  const decoded = decodeToken(token);
  if (!decoded) return false;
  
  // Admin has all permissions
  if (decoded.role === 'super-admin') return true;
  
  return permissions.some(permission => decoded.permissions.includes(permission));
}

/**
 * Check if user has CRM portal access
 * Since JWT token doesn't include portalAccess, we check by role
 * Roles that should NOT have CRM access: supplier, distributor, buyer
 */
export function hasCrmAccess(token) {
  const decoded = decodeToken(token);
  if (!decoded) return false;
  
  // Roles that should not have CRM access
  const restrictedRoles = ['supplier', 'distributor', 'buyer'];
  
  // If user has a restricted role, they don't have CRM access
  if (restrictedRoles.includes(decoded.role)) {
    return false;
  }
  
  // All other roles (admin, manager, employee, accountant) have CRM access
  return true;
}