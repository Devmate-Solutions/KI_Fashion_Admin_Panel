import apiClient from '../client';

export const saleReturnsAPI = {
  universalSearch: async (query) => {
    const result = await apiClient.get('/sale-returns/universal-search', {
      params: { query }
    });
    return result;
  },

  getAll: async (params = {}) => {
    const result = await apiClient.get('/sale-returns', { params });
    return result;
  },

  getById: async (id) => {
    const result = await apiClient.get(`/sale-returns/${id}`);
    return result;
  },

  getBySale: async (saleId) => {
    const result = await apiClient.get(`/sale-returns/sale/${saleId}`);
    return result;
  },

  create: async (data) => {
    const result = await apiClient.post('/sale-returns', data);
    return result;
  },

  approve: async (id) => {
    const result = await apiClient.patch(`/sale-returns/${id}/approve`);
    return result;
  },

  reject: async (id, rejectionNotes) => {
    const result = await apiClient.patch(`/sale-returns/${id}/reject`, { rejectionNotes });
    return result;
  },
};

