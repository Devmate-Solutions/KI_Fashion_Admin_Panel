import apiClient from '@/lib/api/client';

export const costTypesAPI = {
  // Get all cost types
  getAll: async (params) => {
     
    const result = await apiClient.get('/cost-types', { params });
     
    return result;
  },

  // Get single cost type by ID
  getById: async (id) => {
     
    const result = await apiClient.get(`/cost-types/${id}`);
     
    return result;
  },

  // Create new cost type (e.g., A1=meals)
  create: async (costTypeData) => {
     
    const result = await apiClient.post('/cost-types', costTypeData);
     
    return result;
  },

  // Update existing cost type
  update: async (id, costTypeData) => {
     
    const result = await apiClient.put(`/cost-types/${id}`, costTypeData);
     
    return result;
  },

  // Delete cost type
  delete: async (id) => {
     
    const result = await apiClient.delete(`/cost-types/${id}`);
     
    return result;
  },
};
