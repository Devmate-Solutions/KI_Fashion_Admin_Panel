import apiClient from '../client';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

export const authService = {
  /**
   * Login user with email and password
   */
  async login(credentials) {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { token, user } = response.data;
      
      // Store token in secure cookie
      Cookies.set('auth_token', token, { 
        expires: 1, // 1 day
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict' // Prevent CSRF attacks
      });
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  },

  /**
   * Register new user
   */
  async register(data){
    try {
      const response = await apiClient.post('/auth/register', data);
      const { token, user } = response.data;
      
      Cookies.set('auth_token', token, { 
        expires: 1,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' 
      });
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  },

  /**
   * Get current logged-in user info
   */
  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data.user;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get user' };
    }
  },

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    try {
      const response = await apiClient.post('/auth/refresh');
      const { token } = response.data;
      
      Cookies.set('auth_token', token, { 
        expires: 1,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' 
      });
      
      return token;
    } catch (error) {
      throw error.response?.data || { message: 'Token refresh failed' };
    }
  },

  /**
   * Logout user (remove token)
   */
  logout() {
    Cookies.remove('auth_token');
  },

  /**
   * Get token from cookie
   */
  getToken() {
    return Cookies.get('auth_token');
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      // Check if token is expired
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  /**
   * Decode and return token data
   */
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