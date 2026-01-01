// import { NextResponse } from 'next/server';
// import { verifyToken, decodeToken, hasPermission, hasRole } from './lib/auth-utils';

// // Define route configurations
// const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];
// const AUTH_ROUTES = ['/login', '/register'];
// const API_AUTH_ROUTES = ['/api/auth/login', '/api/auth/register'];

// // Route permission mappings
// const ROUTE_PERMISSIONS = {
//   '/dashboard': {},                                  // Any authenticated user
//   '/buyers': { permissions: ['buyers'] },
//   '/sales': { permissions: ['sales'] },
//   '/products': { permissions: ['products'] },
//   '/inventory': { permissions: ['inventory'] },
//   '/purchases': { permissions: ['purchases'] },
//   '/expenses': { permissions: ['expenses'] },
//   '/users': { permissions: ['users'], roles: ['super-admin', 'admin'] },
//   '/reports': { permissions: ['reports'] },
//   '/settings': { roles: ['super-admin'] },
//   '/logistics': {roles: ['super-admin']},                                  // Any authenticated user can access logistics
//   '/product-types': { roles: ['super-admin'] },            // Admin only
//   '/cost-types': { roles: ['super-admin'] },               // Admin only
//   '/delivery-personnel': { roles: ['super-admin'] },       // Admin only
//   '/home': {},                                       // Any authenticated user
//   '/buying': {},                                     // Any authenticated user
//   '/selling': {},                                    // Any authenticated user
//   '/stock': {},                                      // Any authenticated user
//   '/customer-ledger': {},                            // Any authenticated user
//   '/supplier-ledger': {},                            // Any authenticated user
//   '/daily-report-form': {},                          // Any authenticated user
//   '/setup': { roles: ['super-admin'] },                    // Admin only
// };

// /**
//  * Main Middleware Function
//  * Runs on every request to check authentication and authorization
//  */
// export function middleware(request) {
//   const { pathname } = request.nextUrl;
  
//   // Allow API auth routes
//   if (API_AUTH_ROUTES.some(route => pathname.startsWith(route))) {
//     return NextResponse.next();
//   }

//   // Get authentication token from cookies
//   const token = request.cookies.get('auth_token')?.value;
  
//   // Check if route is public
//   const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
//   const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

//   // ============================================
//   // 1. Handle Unauthenticated Users
//   // ============================================
//   if (!token || !verifyToken(token)) {
//     // If trying to access protected route, redirect to login
//     if (!isPublicRoute) {
//       const loginUrl = new URL('/login', request.url);
//       loginUrl.searchParams.set('redirect', pathname);
//       return NextResponse.redirect(loginUrl);
//     }
    
//     // Allow access to public routes
//     return NextResponse.next();
//   }

//   // ============================================
//   // 2. Handle Authenticated Users
//   // ============================================
  
//   // If authenticated user tries to access auth pages, redirect to dashboard
//   if (isAuthRoute) {
//     return NextResponse.redirect(new URL('/dashboard', request.url));
//   }

//   // ============================================
//   // 3. Check Route Permissions
//   // ============================================
  
//   // Find matching route permission config
//   const routeConfig = Object.entries(ROUTE_PERMISSIONS).find(([route]) => 
//     pathname.startsWith(route)
//   )?.[1];

//   if (routeConfig) {
//     const decoded = decodeToken(token);
    
//     if (!decoded) {
//       // Invalid token, redirect to login
//       return NextResponse.redirect(new URL('/login', request.url));
//     }

//     // Check role requirements
//     if (routeConfig.roles && !hasRole(token, routeConfig.roles)) {
//       return NextResponse.redirect(new URL('/unauthorized', request.url));
//     }

//     // Check permission requirements
//     if (routeConfig.permissions) {
//       const hasRequiredPermission = routeConfig.permissions.some(permission => 
//         hasPermission(token, permission)
//       );
      
//       if (!hasRequiredPermission) {
//         return NextResponse.redirect(new URL('/unauthorized', request.url));
//       }
//     }
//   }

//   // ============================================
//   // 4. Add User Info to Request Headers
//   // ============================================
  
//   // Add decoded token data to headers for use in server components
//   const decoded = decodeToken(token);
//   if (decoded) {
//     const requestHeaders = new Headers(request.headers);
//     requestHeaders.set('x-user-id', decoded.id);
//     requestHeaders.set('x-user-email', decoded.email);
//     requestHeaders.set('x-user-role', decoded.role);
//     // requestHeaders.set('x-user-permissions', decoded.permissions.join(','));
    
//     return NextResponse.next({
//       request: {
//         headers: requestHeaders,
//       },
//     });
//   }

//   return NextResponse.next();
// }

// /**
//  * Middleware Config
//  * Specify which routes the middleware should run on
//  */
// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except:
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      * - public folder
//      */
//     '/((?!_next/static|_next/image|favicon.ico|public).*)',
//   ],
// };






import { NextResponse } from 'next/server';
import { verifyToken, decodeToken, hasPermission, hasRole, hasCrmAccess } from './lib/auth-utils';

// Define route configurations
const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];
const AUTH_ROUTES = ['/login'];
const API_AUTH_ROUTES = ['/api/auth/login'];

// Route permission mappings
const ROUTE_PERMISSIONS = {
  '/dashboard': {},                                  // Any authenticated user
  '/buyers': { permissions: ['buyers'] },
  '/sales': { permissions: ['sales'] },
  '/products': { permissions: ['products'] },
  '/inventory': { permissions: ['inventory'] },
  '/purchases': { permissions: ['purchases'] },
  '/expenses': { permissions: ['expenses'] },
  '/users': { permissions: ['users'], roles: ['super-admin', 'admin'] },
  '/reports': { permissions: ['reports'] },
  '/settings': { roles: ['super-admin'] },
  '/logistics': {roles: ['super-admin']},                                  // Any authenticated user can access logistics
  '/dispatch-orders': { roles: ['super-admin', 'admin'] }, // Admin and manager can access dispatch orders
  '/product-types': { roles: ['super-admin'] },            // Admin only
  '/cost-types': { roles: ['super-admin'] },               // Admin only
  '/delivery-personnel': { roles: ['super-admin'] },       // Admin only
  '/home': {},                                       // Any authenticated user
  '/buying': {},                                     // Any authenticated user
  '/selling': {},                                    // Any authenticated user
  '/stock': {},                                      // Any authenticated user
  '/customer-ledger': {},                            // Any authenticated user
  '/supplier-ledger': {},                            // Any authenticated user
  '/daily-report-form': {},                          // Any authenticated user
  '/setup': { roles: ['super-admin'] },                    // Admin only
};

/**
 * Main Middleware Function
 * Runs on every request to check authentication and authorization
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Allow API auth routes
  if (API_AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get authentication token from cookies
  const token = request.cookies.get('auth_token')?.value;
  
  // Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));

  // ============================================
  // 1. Handle Unauthenticated Users
  // ============================================
  if (!token || !verifyToken(token)) {
    // If trying to access protected route, redirect to login
    if (!isPublicRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Allow access to public routes
    return NextResponse.next();
  }

  // ============================================
  // 2. Handle Authenticated Users
  // ============================================
  
  // Check if user has CRM portal access
  // This prevents suppliers, distributors, and buyers from accessing CRM dashboard
  if (!hasCrmAccess(token)) {
    // User doesn't have CRM access - clear token and redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'access_denied');
    const response = NextResponse.redirect(loginUrl);
    // Clear the auth token cookie
    response.cookies.delete('auth_token');
    return response;
  }
  
  // If authenticated user tries to access auth pages, redirect to home
  if (isAuthRoute) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // ============================================
  // 3. Check Route Permissions
  // ============================================
  
  // Find matching route permission config
  const routeConfig = Object.entries(ROUTE_PERMISSIONS).find(([route]) => 
    pathname.startsWith(route)
  )?.[1];

  if (routeConfig) {
    const decoded = decodeToken(token);
    
    console.log('====== MIDDLEWARE DEBUG ======');
    console.log('Pathname:', pathname);
    console.log('Route Config:', routeConfig);
    console.log('Decoded Token:', decoded);
    
    if (!decoded) {
      console.log('Token decoding failed - redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check role requirements
    if (routeConfig.roles) {
      console.log('Required Roles:', routeConfig.roles);
      console.log('User Role:', decoded.role);
      
      const hasRequiredRole = hasRole(token, routeConfig.roles);
      console.log('hasRole() returned:', hasRequiredRole);
      
      if (!hasRequiredRole) {
        console.log('❌ Role check FAILED - redirecting to unauthorized');
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
      console.log('✅ Role check PASSED');
    }

    // Check permission requirements
    if (routeConfig.permissions) {
      console.log('Required Permissions:', routeConfig.permissions);
      console.log('User Permissions:', decoded.permissions);
      
      const hasRequiredPermission = routeConfig.permissions.some(permission => 
        hasPermission(token, permission)
      );
      
      console.log('Permission check result:', hasRequiredPermission);
      
      if (!hasRequiredPermission) {
        console.log('❌ Permission check FAILED - redirecting to unauthorized');
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
      console.log('✅ Permission check PASSED');
    }
    
    console.log('====== END DEBUG ======\n');
  }

  // ============================================
  // 4. Add User Info to Request Headers
  // ============================================
  
  // Add decoded token data to headers for use in server components
  const decoded = decodeToken(token);
  if (decoded) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.id);
    requestHeaders.set('x-user-email', decoded.email);
    requestHeaders.set('x-user-role', decoded.role);
    // requestHeaders.set('x-user-permissions', decoded.permissions.join(','));
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

/**
 * Middleware Config
 * Specify which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};