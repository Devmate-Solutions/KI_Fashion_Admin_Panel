import apiClient from '../client';

export const passwordResetRequestsAPI = {
  getAll: async (params) => {
     
    const result = await apiClient.get('/password-reset-requests', { params });
     
    return result;
  },

  getById: async (id) => {
     
    const result = await apiClient.get(`/password-reset-requests/${id}`);
     
    return result;
  },

  complete: async (id) => {
     
    const result = await apiClient.patch(`/password-reset-requests/${id}/complete`);
     
    return result;
  },

  cancel: async (id) => {
     
    const result = await apiClient.patch(`/password-reset-requests/${id}/cancel`);
     
    return result;
  },

  delete: async (id) => {
     
    const result = await apiClient.delete(`/password-reset-requests/${id}`);
     
    return result;
  },
};

