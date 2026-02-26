import apiClient from '../client';

export const suppliersAPI = {
  getAll: async (params) => {
     
    const result = await apiClient.get('/suppliers', { params });
     
    return result;
  },

  getById: async (id) => {
     
    const result = await apiClient.get(`/suppliers/${id}`);
     
    return result;
  },

  create: async (supplierData) => {
     
    const result = await apiClient.post('/suppliers', supplierData);
     
    return result;
  },

  update: async (id, supplierData) => {
     
    const result = await apiClient.put(`/suppliers/${id}`, supplierData);
     
    return result;
  },

  updateBalance: async (id, balanceData) => {
     
    const result = await apiClient.patch(`/suppliers/${id}/balance`, balanceData);
     
    return result;
  },

  delete: async (id) => {
     
    const result = await apiClient.delete(`/suppliers/${id}`);
     
    return result;
  },
};