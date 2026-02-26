import apiClient from '@/lib/api/client';

export const deliveryPersonnelAPI = {
  // Get all delivery personnel
  getAll: async (params) => {
     
    const result = await apiClient.get('/delivery-personnel', { params });
     
    return result;
  },

  // Get single delivery personnel by ID
  getById: async (id) => {
     
    const result = await apiClient.get(`/delivery-personnel/${id}`);
     
    return result;
  },

  // Create new delivery personnel
  create: async (personnelData) => {
     
    const result = await apiClient.post('/delivery-personnel', personnelData);
     
    return result;
  },

  // Update existing delivery personnel
  update: async (id, personnelData) => {
     
    const result = await apiClient.put(`/delivery-personnel/${id}`, personnelData);
     
    return result;
  },

  // Update delivery statistics
  updateStats: async (id, statsData) => {
     
    const result = await apiClient.patch(`/delivery-personnel/${id}/stats`, statsData);
     
    return result;
  },

  // Delete delivery personnel
  delete: async (id) => {
     
    const result = await apiClient.delete(`/delivery-personnel/${id}`);
     
    return result;
  },
};
