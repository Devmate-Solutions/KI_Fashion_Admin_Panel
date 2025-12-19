import apiClient from '../client';

export const suppliersAPI = {
  getAll: async (params) => {
    console.log('suppliersAPI.getAll called with params:', params);
    const result = await apiClient.get('/suppliers', { params });
    console.log('suppliersAPI.getAll response:', result);
    return result;
  },

  getById: async (id) => {
    console.log('suppliersAPI.getById called with id:', id);
    const result = await apiClient.get(`/suppliers/${id}`);
    console.log('suppliersAPI.getById response:', result);
    return result;
  },

  create: async (supplierData) => {
    console.log('suppliersAPI.create called with data:', supplierData);
    const result = await apiClient.post('/suppliers', supplierData);
    console.log('suppliersAPI.create response:', result);
    return result;
  },

  update: async (id, supplierData) => {
    console.log('suppliersAPI.update called with id:', id, 'data:', supplierData);
    const result = await apiClient.put(`/suppliers/${id}`, supplierData);
    console.log('suppliersAPI.update response:', result);
    return result;
  },

  updateBalance: async (id, balanceData) => {
    console.log('suppliersAPI.updateBalance called with id:', id, 'data:', balanceData);
    const result = await apiClient.patch(`/suppliers/${id}/balance`, balanceData);
    console.log('suppliersAPI.updateBalance response:', result);
    return result;
  },

  delete: async (id) => {
    console.log('suppliersAPI.delete called with id:', id);
    const result = await apiClient.delete(`/suppliers/${id}`);
    console.log('suppliersAPI.delete response:', result);
    return result;
  },
};