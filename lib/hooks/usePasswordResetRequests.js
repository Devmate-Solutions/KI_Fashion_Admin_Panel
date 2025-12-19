import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { passwordResetRequestsAPI } from '../api/endpoints/passwordResetRequests';
import toast from 'react-hot-toast';

export const passwordResetRequestsKeys = {
  all: ['passwordResetRequests'],
  lists: () => [...passwordResetRequestsKeys.all, 'list'],
  list: (filters) => [...passwordResetRequestsKeys.lists(), filters],
  details: () => [...passwordResetRequestsKeys.all, 'detail'],
  detail: (id) => [...passwordResetRequestsKeys.details(), id],
};

export const usePasswordResetRequests = (params = {}) => {
  return useQuery({
    queryKey: passwordResetRequestsKeys.list(params),
    queryFn: () => {
      console.log('usePasswordResetRequests: Fetching requests with params:', params);
      return passwordResetRequestsAPI.getAll(params);
    },
    select: (response) => {
      console.log('usePasswordResetRequests: Raw API response:', response);
      const requests = response.data?.data || response.data || [];
      console.log('usePasswordResetRequests: Processed requests data:', requests);

      return requests.map(request => ({
        id: request._id || request.id,
        userId: request.userId?._id || request.userId?.id || request.userId,
        userName: request.userId?.name || 'N/A',
        userEmail: request.userId?.email || request.email,
        email: request.email,
        status: request.status,
        portalSource: request.portalSource,
        requestedAt: request.requestedAt || request.createdAt,
        completedAt: request.completedAt,
        completedBy: request.completedBy?._id || request.completedBy?.id || request.completedBy,
        completedByName: request.completedBy?.name || null,
        createdAt: request.createdAt,
        _original: request,
      }));
    },
  });
};

export const usePasswordResetRequest = (id) => {
  return useQuery({
    queryKey: passwordResetRequestsKeys.detail(id),
    queryFn: () => passwordResetRequestsAPI.getById(id),
    enabled: !!id,
    select: (response) => {
      const request = response?.data?.data || response?.data || null;
      if (!request) return null;

      return {
        id: request._id || request.id,
        userId: request.userId?._id || request.userId?.id || request.userId,
        userName: request.userId?.name || 'N/A',
        userEmail: request.userId?.email || request.email,
        email: request.email,
        status: request.status,
        portalSource: request.portalSource,
        requestedAt: request.requestedAt || request.createdAt,
        completedAt: request.completedAt,
        completedBy: request.completedBy?._id || request.completedBy?.id || request.completedBy,
        completedByName: request.completedBy?.name || null,
        createdAt: request.createdAt,
        _original: request,
      };
    },
  });
};

export const useCompleteRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => {
      console.log('useCompleteRequest: Completing request with id:', id);
      return passwordResetRequestsAPI.complete(id);
    },
    onSuccess: (response) => {
      console.log('useCompleteRequest: Success response:', response);
      queryClient.invalidateQueries({ queryKey: passwordResetRequestsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: passwordResetRequestsKeys.details() });
      const message = response?.data?.message || response?.message || 'Password reset request completed successfully!';
      toast.success(message);
      return response;
    },
    onError: (error) => {
      console.error('useCompleteRequest: Error:', error);
      console.error('useCompleteRequest: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to complete password reset request');
    },
  });
};

export const useCancelRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => {
      console.log('useCancelRequest: Cancelling request with id:', id);
      return passwordResetRequestsAPI.cancel(id);
    },
    onSuccess: (response) => {
      console.log('useCancelRequest: Success response:', response);
      queryClient.invalidateQueries({ queryKey: passwordResetRequestsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: passwordResetRequestsKeys.details() });
      const message = response?.data?.message || response?.message || 'Password reset request cancelled successfully!';
      toast.success(message);
    },
    onError: (error) => {
      console.error('useCancelRequest: Error:', error);
      console.error('useCancelRequest: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to cancel password reset request');
    },
  });
};

export const useDeleteRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => {
      console.log('useDeleteRequest: Deleting request with id:', id);
      return passwordResetRequestsAPI.delete(id);
    },
    onSuccess: (response) => {
      console.log('useDeleteRequest: Success response:', response);
      queryClient.invalidateQueries({ queryKey: passwordResetRequestsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: passwordResetRequestsKeys.details() });
      const message = response?.data?.message || response?.message || 'Password reset request deleted successfully!';
      toast.success(message);
    },
    onError: (error) => {
      console.error('useDeleteRequest: Error:', error);
      console.error('useDeleteRequest: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to delete password reset request');
    },
  });
};

