import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignsAPI } from '@/lib/api/endpoints/campaigns';
import { toast } from 'sonner';

export const campaignKeys = {
  all: ['campaigns'],
  lists: () => [...campaignKeys.all, 'list'],
  list: (filters) => [...campaignKeys.lists(), filters],
  details: () => [...campaignKeys.all, 'detail'],
  detail: (id) => [...campaignKeys.details(), id],
};

export function useCampaigns(params = {}) {
  return useQuery({
    queryKey: campaignKeys.list(params),
    queryFn: async () => {
      const response = await campaignsAPI.getAll(params);
      return response?.data?.data || response?.data || { items: [], pagination: null };
    },
  });
}

export function useCampaign(id) {
  return useQuery({
    queryKey: campaignKeys.detail(id),
    enabled: !!id,
    queryFn: async () => {
      const response = await campaignsAPI.getById(id);
      return response?.data?.data || response?.data || null;
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await campaignsAPI.create(payload);
      return response?.data?.data || response?.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      toast.success('Campaign created successfully');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to create campaign');
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await campaignsAPI.update(id, payload);
      return response?.data?.data || response?.data || response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.id) });
      toast.success('Campaign updated successfully');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to update campaign');
    },
  });
}

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, isActive }) => {
      const response = await campaignsAPI.updateStatus(id, status, isActive);
      return response?.data?.data || response?.data || response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.id) });
      toast.success('Campaign status updated');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to update campaign status');
    },
  });
}

export function useArchiveCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await campaignsAPI.archive(id);
      return response?.data?.data || response?.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      toast.success('Campaign archived');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to archive campaign');
    },
  });
}
