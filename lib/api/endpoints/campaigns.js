import apiClient from "../client";

export const campaignsAPI = {
  getAll: async (params = {}) => {
    const result = await apiClient.get('/campaigns', { params });
    return result;
  },

  getById: async (id) => {
    const result = await apiClient.get(`/campaigns/${id}`);
    return result;
  },

  create: async (payload) => {
    const result = await apiClient.post('/campaigns', payload);
    return result;
  },

  update: async (id, payload) => {
    const result = await apiClient.patch(`/campaigns/${id}`, payload);
    return result;
  },

  updateStatus: async (id, status, isActive) => {
    const result = await apiClient.patch(`/campaigns/${id}/status`, {
      status,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    return result;
  },

  archive: async (id) => {
    const result = await apiClient.delete(`/campaigns/${id}`);
    return result;
  },
};
