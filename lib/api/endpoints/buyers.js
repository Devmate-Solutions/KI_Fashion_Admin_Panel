import apiClient from '../client';

export const buyersAPI = {
  getAll: async (params) => {
     
    const result = await apiClient.get('/buyers', { params });
     
    return result;
  },

  getById: async (id) => {
     
    const result = await apiClient.get(`/buyers/${id}`);
     
    return result;
  },

  create: async (buyerData) => {
     
    const result = await apiClient.post('/buyers', buyerData);
     
    return result;
  },

  update: async (id, buyerData) => {
     
    const result = await apiClient.put(`/buyers/${id}`, buyerData);
     
    return result;
  },

  updateBalance: async (id, balanceData) => {
     
    const result = await apiClient.patch(`/buyers/${id}/balance`, balanceData);
     
    return result;
  },

  delete: async (id) => {
     
    const result = await apiClient.delete(`/buyers/${id}`);
     
    return result;
  },
};