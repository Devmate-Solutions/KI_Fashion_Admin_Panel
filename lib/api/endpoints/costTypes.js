import apiClient from '@/lib/api/client';

export const costTypesAPI = {
  // Get all cost types
  getAll: async (params) => {
    console.log('costTypesAPI.getAll called with params:', params);
    const result = await apiClient.get('/cost-types', { params });
    console.log('costTypesAPI.getAll response:', result);
    return result;
  },

  // Get single cost type by ID
  getById: async (id) => {
    console.log('costTypesAPI.getById called with id:', id);
    const result = await apiClient.get(`/cost-types/${id}`);
    console.log('costTypesAPI.getById response:', result);
    return result;
  },

  // Create new cost type (e.g., A1=meals)
  create: async (costTypeData) => {
    console.log('costTypesAPI.create called with data:', costTypeData);
    const result = await apiClient.post('/cost-types', costTypeData);
    console.log('costTypesAPI.create response:', result);
    return result;
  },

  // Update existing cost type
  update: async (id, costTypeData) => {
    console.log('costTypesAPI.update called with id:', id, 'data:', costTypeData);
    const result = await apiClient.put(`/cost-types/${id}`, costTypeData);
    console.log('costTypesAPI.update response:', result);
    return result;
  },

  // Delete cost type
  delete: async (id) => {
    console.log('costTypesAPI.delete called with id:', id);
    const result = await apiClient.delete(`/cost-types/${id}`);
    console.log('costTypesAPI.delete response:', result);
    return result;
  },
};
