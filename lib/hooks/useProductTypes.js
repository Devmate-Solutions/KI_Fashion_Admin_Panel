import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productTypesAPI } from '../api/endpoints/productTypes';
import toast from 'react-hot-toast';

export const productTypesKeys = {
  all: ['productTypes'],
  lists: () => [...productTypesKeys.all, 'list'],
  list: (filters) => [...productTypesKeys.lists(), filters],
  details: () => [...productTypesKeys.all, 'detail'],
  detail: (id) => [...productTypesKeys.details(), id],
};

export const useProductTypes = (params = {}) => {
  return useQuery({
    queryKey: productTypesKeys.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes - product types rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    queryFn: () => {
       
      return productTypesAPI.getAll(params);
    },
    select: (response) => {
       
      const productTypes = response.data?.data || response.data || [];
       

      return productTypes.map(type => ({
        id: type._id || type.id,
        name: type.name,
        description: type.description || '',
        attributes: type.attributes || [],
        category: type.category || '',
        createdAt: type.createdAt,
        _original: type,
      }));
    },
  });
};

export const useProductType = (id) => {
  return useQuery({
    queryKey: productTypesKeys.detail(id),
    queryFn: () => productTypesAPI.getById(id),
    enabled: !!id,
    select: (response) => {
      const type = response?.data?.data || response?.data || null;
      if (!type) return null;

      return {
        id: type._id || type.id,
        name: type.name,
        description: type.description || '',
        attributes: type.attributes || [],
        category: type.category || '',
        createdAt: type.createdAt,
        _original: type,
      };
    },
  });
};

export const useCreateProductType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productTypeData) => {
       
      return productTypesAPI.create(productTypeData);
    },
    onSuccess: (response) => {
       
      queryClient.invalidateQueries({ queryKey: productTypesKeys.lists() });
      toast.success(response.message || 'Product type created successfully!');
    },
    onError: (error) => {
      console.error('useCreateProductType: Error:', error);
      console.error('useCreateProductType: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to create product type');
    },
  });
};

export const useUpdateProductType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => {
       
      return productTypesAPI.update(id, data);
    },
    onSuccess: (response, variables) => {
       
      queryClient.invalidateQueries({ queryKey: productTypesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productTypesKeys.detail(variables.id) });
      toast.success(response.message || 'Product type updated successfully!');
    },
    onError: (error) => {
      console.error('useUpdateProductType: Error:', error);
      console.error('useUpdateProductType: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to update product type');
    },
  });
};

export const useDeleteProductType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => {
       
      return productTypesAPI.delete(id);
    },
    onSuccess: (response) => {
       
      queryClient.invalidateQueries({ queryKey: productTypesKeys.lists() });
      toast.success(response.message || 'Product type deleted successfully!');
    },
    onError: (error) => {
      console.error('useDeleteProductType: Error:', error);
      console.error('useDeleteProductType: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to delete product type');
    },
  });
};
