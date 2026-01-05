import apiClient from '../client';

export const buyersAPI = {
  getAll: async (params) => {
    console.log('buyersAPI.getAll called with params:', params);
    const result = await apiClient.get('/buyers', { params });
    console.log('buyersAPI.getAll response:', result);
    return result;
  },

  getById: async (id) => {
    console.log('buyersAPI.getById called with id:', id);
    const result = await apiClient.get(`/buyers/${id}`);
    console.log('buyersAPI.getById response:', result);
    return result;
  },

  create: async (buyerData) => {
    console.log('buyersAPI.create called with data:', buyerData);
    const result = await apiClient.post('/buyers', buyerData);
    console.log('buyersAPI.create response:', result);
    return result;
  },

  update: async (id, buyerData) => {
    console.log('buyersAPI.update called with id:', id, 'data:', buyerData);
    const result = await apiClient.put(`/buyers/${id}`, buyerData);
    console.log('buyersAPI.update response:', result);
    return result;
  },

  updateBalance: async (id, balanceData) => {
    console.log('buyersAPI.updateBalance called with id:', id, 'data:', balanceData);
    const result = await apiClient.patch(`/buyers/${id}/balance`, balanceData);
    console.log('buyersAPI.updateBalance response:', result);
    return result;
  },

  delete: async (id) => {
    console.log('buyersAPI.delete called with id:', id);
    const result = await apiClient.delete(`/buyers/${id}`);
    console.log('buyersAPI.delete response:', result);
    return result;
  },
};