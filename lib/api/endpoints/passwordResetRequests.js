import apiClient from '../client';

export const passwordResetRequestsAPI = {
  getAll: async (params) => {
    console.log('passwordResetRequestsAPI.getAll called with params:', params);
    const result = await apiClient.get('/password-reset-requests', { params });
    console.log('passwordResetRequestsAPI.getAll response:', result);
    return result;
  },

  getById: async (id) => {
    console.log('passwordResetRequestsAPI.getById called with id:', id);
    const result = await apiClient.get(`/password-reset-requests/${id}`);
    console.log('passwordResetRequestsAPI.getById response:', result);
    return result;
  },

  complete: async (id) => {
    console.log('passwordResetRequestsAPI.complete called with id:', id);
    const result = await apiClient.patch(`/password-reset-requests/${id}/complete`);
    console.log('passwordResetRequestsAPI.complete response:', result);
    return result;
  },

  cancel: async (id) => {
    console.log('passwordResetRequestsAPI.cancel called with id:', id);
    const result = await apiClient.patch(`/password-reset-requests/${id}/cancel`);
    console.log('passwordResetRequestsAPI.cancel response:', result);
    return result;
  },

  delete: async (id) => {
    console.log('passwordResetRequestsAPI.delete called with id:', id);
    const result = await apiClient.delete(`/password-reset-requests/${id}`);
    console.log('passwordResetRequestsAPI.delete response:', result);
    return result;
  },
};

