import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { editRequestsAPI } from '@/lib/api/endpoints/editRequests';
import { toast } from 'sonner';

export const editRequestKeys = {
  all: ['editRequests'],
  lists: () => [...editRequestKeys.all, 'list'],
  list: (filters) => [...editRequestKeys.lists(), filters],
  details: () => [...editRequestKeys.all, 'detail'],
  detail: (id) => [...editRequestKeys.details(), id],
  pendingCount: () => [...editRequestKeys.all, 'pendingCount'],
  unacknowledged: () => [...editRequestKeys.all, 'unacknowledged'],
};

// Fetch paginated edit requests
export function useEditRequests(params = {}) {
  return useQuery({
    queryKey: editRequestKeys.list(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await editRequestsAPI.list(params);
      const raw = response?.data?.data || { rows: [], total: 0, page: 1, totalPages: 1 };
      
      const transformedRows = (raw.rows || []).map(row => ({
        ...row,
        requestedByName: row.requestedBy?.name || 'Unknown',
        reviewedByName: row.reviewedBy?.name || 'N/A'
      }));

      return {
        requests: transformedRows,
        pagination: {
          page: raw.page || 1,
          pages: raw.totalPages || 1,
          total: raw.total || 0,
        },
      };
    },
  });
}

// Fetch single edit request
export function useEditRequest(id) {
  return useQuery({
    queryKey: editRequestKeys.detail(id),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await editRequestsAPI.getById(id);
      return response?.data?.data || null;
    },
    enabled: !!id,
  });
}

// Pending count for sidebar badge (polls every 30s, super-admin only)
export function usePendingRequestCount() {
  const isSuperAdmin = typeof window !== 'undefined';
  return useQuery({
    queryKey: editRequestKeys.pendingCount(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
    queryFn: async () => {
      try {
        const response = await editRequestsAPI.getPendingCount();
        return response?.data?.data?.count || 0;
      } catch {
        return 0;
      }
    },
  });
}

// Unacknowledged notifications
export function useUnacknowledgedRequests() {
  return useQuery({
    queryKey: editRequestKeys.unacknowledged(),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await editRequestsAPI.getUnacknowledged();
      return response?.data?.data || [];
    },
  });
}

// Submit new request
export function useSubmitEditRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => editRequestsAPI.submit(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: editRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: editRequestKeys.pendingCount() });
      const msg = response?.data?.message || 'Request submitted for approval of super admin';
      toast.success(msg);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to submit request';
      toast.error(message);
    },
  });
}

// Approve request (super-admin)
export function useApproveEditRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => editRequestsAPI.approve(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: editRequestKeys.all });
      // Also invalidate entity-specific queries
      queryClient.invalidateQueries({ queryKey: ['dispatchOrders'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      const msg = response?.data?.message || 'Request approved';
      toast.success(msg);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to approve request';
      toast.error(message);
    },
  });
}

// Reject request (super-admin)
export function useRejectEditRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => editRequestsAPI.reject(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: editRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: editRequestKeys.pendingCount() });
      const msg = response?.data?.message || 'Request rejected';
      toast.success(msg);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to reject request';
      toast.error(message);
    },
  });
}

// Cancel own pending request
export function useCancelEditRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => editRequestsAPI.cancel(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: editRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: editRequestKeys.pendingCount() });
      const msg = response?.data?.message || 'Request cancelled';
      toast.success(msg);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to cancel request';
      toast.error(message);
    },
  });
}

// Acknowledge notification
export function useAcknowledgeEditRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => editRequestsAPI.acknowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: editRequestKeys.unacknowledged() });
    },
  });
}
