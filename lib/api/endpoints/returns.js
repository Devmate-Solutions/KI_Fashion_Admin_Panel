import apiClient from '../client';

export const returnsAPI = {
  getAll: async (params = {}) => {
    const result = await apiClient.get('/returns', { params });
    return result;
  },

  getByDispatchOrder: async (dispatchOrderId) => {
    const result = await apiClient.get(`/returns/dispatch-order/${dispatchOrderId}`);
    return result;
  },

  getById: async (id) => {
    const result = await apiClient.get(`/returns/${id}`);
    return result;
  },

  // Get products available for return with inventory and cost price information
  getProductsForReturn: async (params = {}) => {
    const result = await apiClient.get('/returns/products-for-return', { params });
    return result;
  },

  // Get packet stocks available for return from a supplier
  getPacketStocksForReturn: async (params = {}) => {
    const result = await apiClient.get('/returns/packet-stocks-for-return', { params });
    return result;
  },

  // Create a product-level return (returns items directly by product, not by order)
  createProductReturn: async (data) => {
    const result = await apiClient.post('/returns/product-return', data);
    return result;
  },

  // Create a packet-level return (returns full packets, loose items, or partial packets)
  createPacketReturn: async (data) => {
    const result = await apiClient.post('/returns/packet-return', data);
    return result;
  },
};
