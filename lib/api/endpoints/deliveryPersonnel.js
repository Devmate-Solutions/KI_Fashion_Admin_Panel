import apiClient from '@/lib/api/client';

export const deliveryPersonnelAPI = {
  // Get all delivery personnel
  getAll: async (params) => {
    console.log('deliveryPersonnelAPI.getAll called with params:', params);
    const result = await apiClient.get('/delivery-personnel', { params });
    console.log('deliveryPersonnelAPI.getAll response:', result);
    return result;
  },

  // Get single delivery personnel by ID
  getById: async (id) => {
    console.log('deliveryPersonnelAPI.getById called with id:', id);
    const result = await apiClient.get(`/delivery-personnel/${id}`);
    console.log('deliveryPersonnelAPI.getById response:', result);
    return result;
  },

  // Create new delivery personnel
  create: async (personnelData) => {
    console.log('deliveryPersonnelAPI.create called with data:', personnelData);
    const result = await apiClient.post('/delivery-personnel', personnelData);
    console.log('deliveryPersonnelAPI.create response:', result);
    return result;
  },

  // Update existing delivery personnel
  update: async (id, personnelData) => {
    console.log('deliveryPersonnelAPI.update called with id:', id, 'data:', personnelData);
    const result = await apiClient.put(`/delivery-personnel/${id}`, personnelData);
    console.log('deliveryPersonnelAPI.update response:', result);
    return result;
  },

  // Update delivery statistics
  updateStats: async (id, statsData) => {
    console.log('deliveryPersonnelAPI.updateStats called with id:', id, 'data:', statsData);
    const result = await apiClient.patch(`/delivery-personnel/${id}/stats`, statsData);
    console.log('deliveryPersonnelAPI.updateStats response:', result);
    return result;
  },

  // Delete delivery personnel
  delete: async (id) => {
    console.log('deliveryPersonnelAPI.delete called with id:', id);
    const result = await apiClient.delete(`/delivery-personnel/${id}`);
    console.log('deliveryPersonnelAPI.delete response:', result);
    return result;
  },
};
