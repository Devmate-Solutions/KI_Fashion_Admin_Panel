import apiClient from '../client';

export const logisticsCompaniesAPI = {
  getAll: async (params) => {
    console.log('logisticsCompaniesAPI.getAll called with params:', params);
    const result = await apiClient.get('/logistics-companies', { params });
    console.log('logisticsCompaniesAPI.getAll response:', result);
    return result;
  },

  getById: async (id) => {
    console.log('logisticsCompaniesAPI.getById called with id:', id);
    const result = await apiClient.get(`/logistics-companies/${id}`);
    console.log('logisticsCompaniesAPI.getById response:', result);
    return result;
  },

  create: async (companyData) => {
    console.log('logisticsCompaniesAPI.create called with data:', companyData);
    const result = await apiClient.post('/logistics-companies', companyData);
    console.log('logisticsCompaniesAPI.create response:', result);
    return result;
  },

  update: async (id, companyData) => {
    console.log('logisticsCompaniesAPI.update called with id:', id, 'data:', companyData);
    const result = await apiClient.put(`/logistics-companies/${id}`, companyData);
    console.log('logisticsCompaniesAPI.update response:', result);
    return result;
  },

  delete: async (id) => {
    console.log('logisticsCompaniesAPI.delete called with id:', id);
    const result = await apiClient.delete(`/logistics-companies/${id}`);
    console.log('logisticsCompaniesAPI.delete response:', result);
    return result;
  },
};

