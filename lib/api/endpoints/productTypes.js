import apiClient from '@/lib/api/client';

export const productTypesAPI = {
  // Get all product types
  getAll: async (params) => {
     
    const result = await apiClient.get('/product-types', { params });
     
    return result;
  },

  // Get single product type by ID
  getById: async (id) => {
     
    const result = await apiClient.get(`/product-types/${id}`);
     
    return result;
  },

  // Create new product type
  create: async (productTypeData) => {
     
    const result = await apiClient.post('/product-types', productTypeData);
     
    return result;
  },

  // Update existing product type
  update: async (id, productTypeData) => {
     
    const result = await apiClient.put(`/product-types/${id}`, productTypeData);
     
    return result;
  },

  // Delete product type
  delete: async (id) => {
     
    const result = await apiClient.delete(`/product-types/${id}`);
     
    return result;
  },
};
