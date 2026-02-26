import apiClient from '../client';

export const logisticsCompaniesAPI = {
  getAll: async (params) => {
     
    const result = await apiClient.get('/logistics-companies', { params });
     
    return result;
  },

  getById: async (id) => {
     
    const result = await apiClient.get(`/logistics-companies/${id}`);
     
    return result;
  },

  create: async (companyData) => {
     
    const result = await apiClient.post('/logistics-companies', companyData);
     
    return result;
  },

  update: async (id, companyData) => {
     
    const result = await apiClient.put(`/logistics-companies/${id}`, companyData);
     
    return result;
  },

  delete: async (id) => {
     
    const result = await apiClient.delete(`/logistics-companies/${id}`);
     
    return result;
  },
};

