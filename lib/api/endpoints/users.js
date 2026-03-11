import apiClient from '../client';

export const usersAPI = {
  getAll: async (params) => {
     
    const result = await apiClient.get('/users', { params });
     
    return result;
  },

  getById: async (id) => {
     
    const result = await apiClient.get(`/users/${id}`);
     
    return result;
  },

  // Add method to fetch supplier users specifically
  getSuppliers: async (params = {}) => {
     
    const supplierParams = { role: 'supplier', isActive: true, ...params };
    const result = await apiClient.get('/users', { params: supplierParams });
     
    return result;
  },

  update: async (id, userData) => {
     
    const result = await apiClient.put(`/users/${id}`, userData);
     
    return result;
  },

  deactivate: async (id) => {
     
    const result = await apiClient.patch(`/users/${id}/deactivate`);
     
    return result;
  },

  delete: async (id) => {
     
    const result = await apiClient.delete(`/users/${id}`);
     
    return result;
  },

  create: async (userData) => {
     
    const result = await apiClient.post('/users', userData);
     
    return result;
  },

  regeneratePassword: async (id) => {
     
    const result = await apiClient.patch(`/users/${id}/regenerate-password`);
     
    return result;
  },
};
