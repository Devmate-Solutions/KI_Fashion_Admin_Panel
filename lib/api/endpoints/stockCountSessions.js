import apiClient from '../client';

export const stockCountSessionAPI = {
  // Get all sessions
  getAll: (params) => apiClient.get('/stock-count-sessions', { params }),

  // Get active session
  getActive: () => apiClient.get('/stock-count-sessions/active'),

  // Get session by ID
  getById: (id) => apiClient.get(`/stock-count-sessions/${id}`),

  // Start a new session
  start: (data) => apiClient.post('/stock-count-sessions', data),

  // Add scanned item
  addItem: (id, data) => apiClient.post(`/stock-count-sessions/${id}/items`, data),

  // Remove scanned item
  removeItem: (id, itemId) => apiClient.delete(`/stock-count-sessions/${id}/items/${itemId}`),

  // Complete session
  complete: (id, data) => apiClient.patch(`/stock-count-sessions/${id}/complete`, data),

  // Delete session
  delete: (id) => apiClient.delete(`/stock-count-sessions/${id}`),
};
