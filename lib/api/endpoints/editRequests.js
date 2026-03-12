import apiClient from '../client';

export const editRequestsAPI = {
  // Submit a new edit/delete request
  submit: async (data) => {
    return await apiClient.post('/edit-requests', data);
  },

  // List edit requests (super-admin: all; others: own)
  list: async (params) => {
    return await apiClient.get('/edit-requests', { params });
  },

  // Get single request with populated entity
  getById: async (id) => {
    return await apiClient.get(`/edit-requests/${id}`);
  },

  // Get pending count for sidebar badge (super-admin)
  getPendingCount: async () => {
    return await apiClient.get('/edit-requests/pending/count');
  },

  // Get unacknowledged resolved requests (for notifications)
  getUnacknowledged: async () => {
    return await apiClient.get('/edit-requests/unacknowledged');
  },

  // Approve a request (super-admin)
  approve: async (id, data) => {
    return await apiClient.patch(`/edit-requests/${id}/approve`, data);
  },

  // Reject a request (super-admin)
  reject: async (id, data) => {
    return await apiClient.patch(`/edit-requests/${id}/reject`, data);
  },

  // Acknowledge a notification
  acknowledge: async (id) => {
    return await apiClient.patch(`/edit-requests/${id}/acknowledge`);
  },

  // Cancel own pending request
  cancel: async (id) => {
    return await apiClient.delete(`/edit-requests/${id}`);
  },
};
