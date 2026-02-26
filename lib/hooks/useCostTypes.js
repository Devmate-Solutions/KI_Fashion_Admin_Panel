import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { costTypesAPI } from '../api/endpoints/costTypes';
import toast from 'react-hot-toast';

export const costTypesKeys = {
  all: ['costTypes'],
  lists: () => [...costTypesKeys.all, 'list'],
  list: (filters) => [...costTypesKeys.lists(), filters],
  details: () => [...costTypesKeys.all, 'detail'],
  detail: (id) => [...costTypesKeys.details(), id],
};

export const useCostTypes = (params = {}) => {
  return useQuery({
    queryKey: costTypesKeys.list(params),
    queryFn: () => {
       
      return costTypesAPI.getAll(params);
    },
    select: (response) => {
       
      const costTypes = response.data?.data || response.data || [];
       

      return costTypes.map(type => ({
        id: type._id || type.id,
        typeId: type.id || type.typeId || type.costTypeId, // A1, B1, etc.
        name: type.name,
        description: type.description || '',
        category: type.category || '',
        createdAt: type.createdAt,
        _original: type,
      }));
    },
  });
};

export const useCostType = (id) => {
  return useQuery({
    queryKey: costTypesKeys.detail(id),
    queryFn: () => costTypesAPI.getById(id),
    enabled: !!id,
    select: (response) => {
      const type = response?.data?.data || response?.data || null;
      if (!type) return null;

      return {
        id: type._id || type.id,
        typeId: type.id || type.typeId || type.costTypeId,
        name: type.name,
        description: type.description || '',
        category: type.category || '',
        createdAt: type.createdAt,
        _original: type,
      };
    },
  });
};

export const useCreateCostType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (costTypeData) => {
       
      return costTypesAPI.create(costTypeData);
    },
    onSuccess: (response) => {
       
      queryClient.invalidateQueries({ queryKey: costTypesKeys.lists() });
      toast.success(response.message || 'Cost type created successfully!');
    },
    onError: (error) => {
      console.error('useCreateCostType: Error:', error);
      console.error('useCreateCostType: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to create cost type');
    },
  });
};

export const useUpdateCostType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => {
       
      return costTypesAPI.update(id, data);
    },
    onSuccess: (response, variables) => {
       
      queryClient.invalidateQueries({ queryKey: costTypesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: costTypesKeys.detail(variables.id) });
      toast.success(response.message || 'Cost type updated successfully!');
    },
    onError: (error) => {
      console.error('useUpdateCostType: Error:', error);
      console.error('useUpdateCostType: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to update cost type');
    },
  });
};

export const useDeleteCostType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => {
       
      return costTypesAPI.delete(id);
    },
    onSuccess: (response) => {
       
      queryClient.invalidateQueries({ queryKey: costTypesKeys.lists() });
      toast.success(response.message || 'Cost type deleted successfully!');
    },
    onError: (error) => {
      console.error('useDeleteCostType: Error:', error);
      console.error('useDeleteCostType: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to delete cost type');
    },
  });
};
