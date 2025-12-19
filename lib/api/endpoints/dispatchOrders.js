import apiClient from "../client";

export const dispatchOrdersAPI = {
  getAll: async (params = {}) => {
    const result = await apiClient.get("/dispatch-orders", { params });
    return result;
  },

  getById: async (id) => {
    const result = await apiClient.get(`/dispatch-orders/${id}`);
    return result;
  },

  confirm: async (id, paymentData) => {
    console.log("dispatchOrdersAPI.confirm: Sending confirmation request", {
      id,
      paymentData,
    });
    try {
      const result = await apiClient.post(
        `/dispatch-orders/${id}/confirm`,
        paymentData
      );
      console.log("dispatchOrdersAPI.confirm: Success response", result);
      return result;
    } catch (error) {
      console.error("dispatchOrdersAPI.confirm: Error details", {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data,
        error: error.message,
      });
      throw error;
    }
  },

  returnItems: async (id, payload) => {
    const result = await apiClient.post(
      `/dispatch-orders/${id}/return`,
      payload
    );
    return result;
  },

  getUnpaidBySupplier: async (supplierId) => {
    const result = await apiClient.get(`/dispatch-orders/unpaid/${supplierId}`);
    return result;
  },

  delete: async (id) => {
    const result = await apiClient.delete(`/dispatch-orders/${id}`);
    return result;
  },

  // Revert dispatch order status back to pending
  revertToPending: async (id) => {
    console.log("dispatchOrdersAPI.revertToPending called with id:", id);
    const result = await apiClient.patch(
      `/dispatch-orders/${id}/revert-pending`
    );
    console.log("dispatchOrdersAPI.revertToPending response:", result);
    return result;
  },
};
