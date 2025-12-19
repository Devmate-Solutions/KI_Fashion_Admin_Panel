import apiClient from '../client';

export const packetTemplatesAPI = {
  // Get all packet templates
  getAll: (params = {}) => {
    return apiClient.get('/packet-templates', { params });
  },

  // Get single packet template
  getById: (id) => {
    return apiClient.get(`/packet-templates/${id}`);
  },

  // Get templates by product type
  getByProductType: (typeId) => {
    return apiClient.get(`/packet-templates/by-product-type/${typeId}`);
  },

  // Create packet template
  create: (data) => {
    return apiClient.post('/packet-templates', data);
  },

  // Update packet template
  update: (id, data) => {
    return apiClient.put(`/packet-templates/${id}`, data);
  },

  // Delete packet template
  delete: (id) => {
    return apiClient.delete(`/packet-templates/${id}`);
  },

  // Toggle active status
  toggleActive: (id) => {
    return apiClient.patch(`/packet-templates/${id}/toggle-active`);
  }
};

