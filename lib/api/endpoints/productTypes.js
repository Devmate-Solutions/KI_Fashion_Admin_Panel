import apiClient from '@/lib/api/client';

export const productTypesAPI = {
  // Get all product types
  getAll: async (params) => {
    console.log('productTypesAPI.getAll called with params:', params);
    const result = await apiClient.get('/product-types', { params });
    console.log('productTypesAPI.getAll response:', result);
    return result;
  },

  // Get single product type by ID
  getById: async (id) => {
    console.log('productTypesAPI.getById called with id:', id);
    const result = await apiClient.get(`/product-types/${id}`);
    console.log('productTypesAPI.getById response:', result);
    return result;
  },

  // Create new product type
  create: async (productTypeData) => {
    console.log('productTypesAPI.create called with data:', productTypeData);
    const result = await apiClient.post('/product-types', productTypeData);
    console.log('productTypesAPI.create response:', result);
    return result;
  },

  // Update existing product type
  update: async (id, productTypeData) => {
    console.log('productTypesAPI.update called with id:', id, 'data:', productTypeData);
    const result = await apiClient.put(`/product-types/${id}`, productTypeData);
    console.log('productTypesAPI.update response:', result);
    return result;
  },

  // Delete product type
  delete: async (id) => {
    console.log('productTypesAPI.delete called with id:', id);
    const result = await apiClient.delete(`/product-types/${id}`);
    console.log('productTypesAPI.delete response:', result);
    return result;
  },
};
