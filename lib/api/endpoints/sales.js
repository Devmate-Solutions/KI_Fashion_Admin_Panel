import apiClient from '../client';

export const salesAPI = {
  // Get all sales with optional query parameters
  getAll: async (params) => {
    return await apiClient.get('/sales', { params });
  },

  // Get single sale by ID
  getById: async (id) => {
    return await apiClient.get(`/sales/${id}`);
  },

  // Create new sale
  create: async (saleData) => {
    return await apiClient.post('/sales', saleData);
  },

  // Create bulk sales
  createBulk: async (salesData) => {
    return await apiClient.post('/sales/bulk', { sales: salesData });
  },

  // Update sale
  update: async (id, saleData) => {
    return await apiClient.put(`/sales/${id}`, saleData);
  },

  // Mark as delivered
  markDelivered: async (id, deliveryData) => {
    return await apiClient.patch(`/sales/${id}/delivered`, deliveryData);
  },

  // Update payment status
  updatePayment: async (id, paymentData) => {
    return await apiClient.patch(`/sales/${id}/payment`, paymentData);
  },

  // Delete sale (if backend supports it)
  delete: async (id) => {
    return await apiClient.delete(`/sales/${id}`);
  },
};