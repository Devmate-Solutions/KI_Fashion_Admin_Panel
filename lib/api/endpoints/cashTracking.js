import apiClient from '../client';

export const cashTrackingAPI = {
  // Get daily cash summary
  getDaily: async (date) => {
    const result = await apiClient.get(`/cash-tracking/daily/${date}`);
    return result;
  },

  // Get cash summary for date range
  getRange: async (startDate, endDate) => {
    const result = await apiClient.get('/cash-tracking/range', {
      params: { startDate, endDate }
    });
    return result;
  },
};

