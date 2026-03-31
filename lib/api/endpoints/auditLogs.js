import apiClient from '../client';

export const auditLogsAPI = {
  /**
   * List audit logs with pagination and filtering
   * @param {Object} params - { page, limit, userEmail, resource, action, startDate, endDate, search }
   */
  list: async (params) => {
    return await apiClient.get('/audit-logs', { params });
  },

  /**
   * Get dynamic details of a specific audit log
   * @param {string} id - The audit log ID
   */
  getById: async (id) => {
    return await apiClient.get(`/audit-logs/${id}`);
  },
};
