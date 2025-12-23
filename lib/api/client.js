import axios from 'axios';
import Cookies from 'js-cookie';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://kifashionbackend2-production.up.railway.app/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout (increased from 10s to handle slow backend operations)
});

// BEFORE each request, add token to header
apiClient.interceptors.request.use(
  (config) => {
    // Only log in development to reduce overhead
    if (process.env.NODE_ENV === 'development') {
      console.log('API Client: Making request to:', config.url, 'with method:', config.method);
    }
    const token = Cookies.get('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (process.env.NODE_ENV === 'development') {
        console.log('API Client: Added auth token to request');
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('API Client: No auth token found');
      }
    }
    return config;
  },
  (error) => {
    console.error('API Client: Request error:', error);
    return Promise.reject(error);
  }
);

// AFTER each response, handle errors
apiClient.interceptors.response.use(
  (response) => {
    // Only log in development to reduce overhead
    if (process.env.NODE_ENV === 'development') {
      console.log('API Client: Response received for:', response.config.url, 'status:', response.status);
    }
    return response;
  },
  async (error) => {
    // Always log errors for debugging
    console.error('API Client: Response error for:', error.config?.url, 'status:', error.response?.status, 'message:', error.message);

    // Check if response is HTML instead of JSON
    const contentType = error.response?.headers['content-type'];
    if (contentType && contentType.includes('text/html')) {
      console.error('API Client: Received HTML instead of JSON. This usually means the endpoint does not exist or returned an error page.');
      return Promise.reject(new Error('API endpoint not found or returned HTML'));
    }

    const originalRequest = error.config;

    // If 401 Unauthorized and haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to get new token
        const token = Cookies.get('auth_token');
        if (token) {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'https://kl-backend-v2-production-5f50.up.railway.app/api'}/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const newToken = response.data.token;

          // Save new token
          Cookies.set('auth_token', newToken, {
            expires: 1, // 1 day
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          });

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        Cookies.remove('auth_token');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;