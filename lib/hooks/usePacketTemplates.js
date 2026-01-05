import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packetTemplatesAPI } from '../api/endpoints/packetTemplates';
import toast from 'react-hot-toast';

// Query Keys
export const packetTemplatesKeys = {
  all: ['packet-templates'],
  lists: () => [...packetTemplatesKeys.all, 'list'],
  list: (filters) => [...packetTemplatesKeys.lists(), filters],
  details: () => [...packetTemplatesKeys.all, 'detail'],
  detail: (id) => [...packetTemplatesKeys.details(), id],
  byType: (typeId) => [...packetTemplatesKeys.all, 'by-type', typeId],
};

// Get all packet templates
export const usePacketTemplates = (params = {}) => {
  return useQuery({
    queryKey: packetTemplatesKeys.list(params),
    queryFn: () => packetTemplatesAPI.getAll(params),
    select: (response) => response.data?.data || []
  });
};

// Get single packet template
export const usePacketTemplate = (id) => {
  return useQuery({
    queryKey: packetTemplatesKeys.detail(id),
    queryFn: () => packetTemplatesAPI.getById(id),
    enabled: !!id,
    select: (response) => response.data?.data
  });
};

// Get templates by product type
export const usePacketTemplatesByType = (typeId) => {
  return useQuery({
    queryKey: packetTemplatesKeys.byType(typeId),
    queryFn: () => packetTemplatesAPI.getByProductType(typeId),
    enabled: !!typeId,
    select: (response) => response.data?.data || []
  });
};

// Create packet template
export const useCreatePacketTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: packetTemplatesAPI.create,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: packetTemplatesKeys.lists() });
      toast.success(response.data?.message || 'Packet template created successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create packet template';
      toast.error(message);
      console.error('Create packet template error:', error);
    }
  });
};

// Update packet template
export const useUpdatePacketTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => packetTemplatesAPI.update(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: packetTemplatesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: packetTemplatesKeys.detail(variables.id) });
      toast.success(response.data?.message || 'Packet template updated successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update packet template';
      toast.error(message);
      console.error('Update packet template error:', error);
    }
  });
};

// Delete packet template
export const useDeletePacketTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: packetTemplatesAPI.delete,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: packetTemplatesKeys.lists() });
      toast.success(response.data?.message || 'Packet template deleted successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to delete packet template';
      toast.error(message);
      console.error('Delete packet template error:', error);
    }
  });
};

// Toggle active status
export const useTogglePacketTemplateStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: packetTemplatesAPI.toggleActive,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: packetTemplatesKeys.lists() });
      toast.success(response.data?.message || 'Template status updated successfully!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update template status';
      toast.error(message);
      console.error('Toggle template status error:', error);
    }
  });
};

