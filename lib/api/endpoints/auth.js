import apiClient from '@/lib/api-client';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

export const authService = {
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    const { token, user } = response.data;
    
    // Store token in cookie (expires in 1 day)
    Cookies.set('auth_token', token, { expires: 1, secure: true, sameSite: 'strict' });
    
    return response.data;
  },

  async register(data) {
    const response = await apiClient.post('/auth/register', data);
    const { token, user } = response.data;
    
    Cookies.set('auth_token', token, { expires: 1, secure: true, sameSite: 'strict' });
    
    return response.data;
  },

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data.user;
  },

  async refreshToken() {
    const response = await apiClient.post('/auth/refresh');
    const { token } = response.data;
    
    Cookies.set('auth_token', token, { expires: 1, secure: true, sameSite: 'strict' });
    
    return token;
  },

  logout() {
    Cookies.remove('auth_token');
  },

  getToken() {
    return Cookies.get('auth_token');
  },

  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  getDecodedToken() {
    const token = this.getToken();
    if (!token) return null;

    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  }
};