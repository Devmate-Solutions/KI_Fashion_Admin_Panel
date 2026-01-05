import apiClient from '../client';

export const usersAPI = {
  getAll: async (params) => {
    console.log('usersAPI.getAll called with params:', params);
    const result = await apiClient.get('/users', { params });
    console.log('usersAPI.getAll response:', result);
    return result;
  },

  getById: async (id) => {
    console.log('usersAPI.getById called with id:', id);
    const result = await apiClient.get(`/users/${id}`);
    console.log('usersAPI.getById response:', result);
    return result;
  },

  // Add method to fetch supplier users specifically
  getSuppliers: async (params = {}) => {
    console.log('usersAPI.getSuppliers called with params:', params);
    const supplierParams = { role: 'supplier', isActive: true, ...params };
    const result = await apiClient.get('/users', { params: supplierParams });
    console.log('usersAPI.getSuppliers response:', result);
    return result;
  },

  update: async (id, userData) => {
    console.log('usersAPI.update called with id:', id, 'data:', userData);
    const result = await apiClient.put(`/users/${id}`, userData);
    console.log('usersAPI.update response:', result);
    return result;
  },

  deactivate: async (id) => {
    console.log('usersAPI.deactivate called with id:', id);
    const result = await apiClient.patch(`/users/${id}/deactivate`);
    console.log('usersAPI.deactivate response:', result);
    return result;
  },

  delete: async (id) => {
    console.log('usersAPI.delete called with id:', id);
    const result = await apiClient.delete(`/users/${id}`);
    console.log('usersAPI.delete response:', result);
    return result;
  },

  create: async (userData) => {
    console.log('usersAPI.create called with data:', userData);
    // Use the auth/register endpoint to create users
    const result = await apiClient.post('/auth/register', userData);
    console.log('usersAPI.create response:', result);
    return result;
  },

  regeneratePassword: async (id) => {
    console.log('usersAPI.regeneratePassword called with id:', id);
    const result = await apiClient.patch(`/users/${id}/regenerate-password`);
    console.log('usersAPI.regeneratePassword response:', result);
    return result;
  },
};
