import apiClient from '../client';

export const purchasesAPI = {
  // Get all purchases with optional filters
  getAll: async (params) => {
     
    const result = await apiClient.get('/purchases', { params });
     
    return result;
  },

  // Get single purchase by ID
  getById: async (id) => {
     
    const result = await apiClient.get(`/purchases/${id}`);
     
    return result;
  },

  // Create new purchase (uses DispatchOrder manual entry endpoint)
  create: async (purchaseData) => {
     
    // Use the new manual entry endpoint
    const result = await apiClient.post('/dispatch-orders/manual', purchaseData);
     
    return result;
  },

  // Update existing purchase
  update: async (id, purchaseData) => {
     
    const result = await apiClient.put(`/purchases/${id}`, purchaseData);
     
    return result;
  },

  // Delete purchase
  delete: async (id) => {
     
    const result = await apiClient.delete(`/purchases/${id}`);
     
    return result;
  },

  // Mark purchase as delivered
  markDelivered: async (id, deliveryData) => {
     
    const result = await apiClient.patch(`/purchases/${id}/delivered`, deliveryData);
     
    return result;
  },

  // Update payment status
  updatePaymentStatus: async (id, paymentData) => {
     
    const result = await apiClient.patch(`/purchases/${id}/payment`, paymentData);
     
    return result;
  },
};
