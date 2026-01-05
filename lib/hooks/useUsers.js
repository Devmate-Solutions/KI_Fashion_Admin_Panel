import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '../api/endpoints/users';
import toast from 'react-hot-toast';

export const usersKeys = {
  all: ['users'],
  lists: () => [...usersKeys.all, 'list'],
  list: (filters) => [...usersKeys.lists(), filters],
  details: () => [...usersKeys.all, 'detail'],
  detail: (id) => [...usersKeys.details(), id],
};

export const useUsers = (params = {}) => {
  return useQuery({
    queryKey: usersKeys.list(params),
    queryFn: () => {
      console.log('useUsers: Fetching users with params:', params);
      return usersAPI.getAll(params);
    },
    select: (response) => {
      console.log('useUsers: Raw API response:', response);
      const users = response.data?.data || response.data || [];
      console.log("useUsers: Processed users data:", users);

      return users.map(user => ({
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        permissions: user.permissions || [],
        createdAt: user.createdAt,
        signupSource: user.signupSource || 'crm',
        phone: user.phone,
        address: user.address,
        _original: user,
      }));
    },
  });
};

export const useUser = (id) => {
  return useQuery({
    queryKey: usersKeys.detail(id),
    queryFn: () => usersAPI.getById(id),
    enabled: !!id,
    select: (response) => {
      const user = response?.data?.data || response?.data || null;
      if (!user) return null;

      return {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        permissions: user.permissions || [],
        createdAt: user.createdAt,
        _original: user,
      };
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => {
      console.log('useUpdateUser: Updating user with id:', id, 'data:', data);
      return usersAPI.update(id, data);
    },
    onSuccess: (response, variables) => {
      console.log('useUpdateUser: Success response:', response);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      queryClient.invalidateQueries({ queryKey: usersKeys.detail(variables.id) });
      toast.success(response.message || 'User updated successfully!');
    },
    onError: (error) => {
      console.error('useUpdateUser: Error:', error);
      console.error('useUpdateUser: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to update user');
    },
  });
};

export const useDeactivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => {
      console.log('useDeactivateUser: Deactivating user with id:', id);
      return usersAPI.deactivate(id);
    },
    onSuccess: (response) => {
      console.log('useDeactivateUser: Success response:', response);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success(response.message || 'User deactivated successfully!');
    },
    onError: (error) => {
      console.error('useDeactivateUser: Error:', error);
      console.error('useDeactivateUser: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to deactivate user');
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => {
      console.log('useDeleteUser: Deleting user with id:', id);
      return usersAPI.delete(id);
    },
    onSuccess: (response) => {
      console.log('useDeleteUser: Success response:', response);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success(response.message || 'User deleted successfully!');
    },
    onError: (error) => {
      console.error('useDeleteUser: Error:', error);
      console.error('useDeleteUser: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData) => {
      console.log('useCreateUser: Creating user with data:', userData);
      return usersAPI.create(userData);
    },
    onSuccess: (response) => {
      console.log('useCreateUser: Success response:', response);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      toast.success(response.message || 'User created successfully!');
    },
    onError: (error) => {
      console.error('useCreateUser: Error:', error);
      console.error('useCreateUser: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to create user');
    },
  });
};

export const useRegeneratePassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => {
      console.log('useRegeneratePassword: Regenerating password for user id:', id);
      return usersAPI.regeneratePassword(id);
    },
    onSuccess: (response) => {
      console.log('useRegeneratePassword: Success response:', response);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
      const message = response?.data?.message || response?.message || 'Password regenerated successfully!';
      toast.success(message);
      return response;
    },
    onError: (error) => {
      console.error('useRegeneratePassword: Error:', error);
      console.error('useRegeneratePassword: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to regenerate password');
    },
  });
};