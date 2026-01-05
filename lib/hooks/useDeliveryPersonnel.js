import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryPersonnelAPI } from '../api/endpoints/deliveryPersonnel';
import toast from 'react-hot-toast';

export const deliveryPersonnelKeys = {
  all: ['deliveryPersonnel'],
  lists: () => [...deliveryPersonnelKeys.all, 'list'],
  list: (filters) => [...deliveryPersonnelKeys.lists(), filters],
  details: () => [...deliveryPersonnelKeys.all, 'detail'],
  detail: (id) => [...deliveryPersonnelKeys.details(), id],
};

export const useDeliveryPersonnel = (params = {}) => {
  return useQuery({
    queryKey: deliveryPersonnelKeys.list(params),
    queryFn: () => {
      console.log('useDeliveryPersonnel: Fetching delivery personnel with params:', params);
      return deliveryPersonnelAPI.getAll(params);
    },
    select: (response) => {
      console.log('useDeliveryPersonnel: Raw API response:', response);
      const personnel = response.data?.data || response.data || [];
      console.log("useDeliveryPersonnel: Processed personnel data:", personnel);

      return personnel.map(person => ({
        id: person._id || person.id,
        name: person.name,
        phone: person.phone || '',
        email: person.email || '',
        vehicleNumber: person.vehicleNumber || '',
        vehicleType: person.vehicleType || '',
        status: person.status || 'active',
        totalDeliveries: person.totalDeliveries || 0,
        completedDeliveries: person.completedDeliveries || 0,
        rating: person.rating || 0,
        _original: person,
      }));
    },
  });
};

export const useDeliveryPerson = (id) => {
  return useQuery({
    queryKey: deliveryPersonnelKeys.detail(id),
    queryFn: () => deliveryPersonnelAPI.getById(id),
    enabled: !!id,
    select: (response) => {
      const person = response?.data?.data || response?.data || null;
      if (!person) return null;

      return {
        id: person._id || person.id,
        name: person.name,
        phone: person.phone || '',
        email: person.email || '',
        vehicleNumber: person.vehicleNumber || '',
        vehicleType: person.vehicleType || '',
        status: person.status || 'active',
        totalDeliveries: person.totalDeliveries || 0,
        completedDeliveries: person.completedDeliveries || 0,
        rating: person.rating || 0,
        _original: person,
      };
    },
  });
};

export const useCreateDeliveryPersonnel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (personnelData) => {
      console.log('useCreateDeliveryPersonnel: Creating delivery personnel with data:', personnelData);
      return deliveryPersonnelAPI.create(personnelData);
    },
    onSuccess: (response) => {
      console.log('useCreateDeliveryPersonnel: Success response:', response);
      queryClient.invalidateQueries({ queryKey: deliveryPersonnelKeys.lists() });
      toast.success(response.message || 'Delivery personnel created successfully!');
    },
    onError: (error) => {
      console.error('useCreateDeliveryPersonnel: Error:', error);
      console.error('useCreateDeliveryPersonnel: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to create delivery personnel');
    },
  });
};

export const useUpdateDeliveryPersonnel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => {
      console.log('useUpdateDeliveryPersonnel: Updating delivery personnel with id:', id, 'data:', data);
      return deliveryPersonnelAPI.update(id, data);
    },
    onSuccess: (response, variables) => {
      console.log('useUpdateDeliveryPersonnel: Success response:', response);
      queryClient.invalidateQueries({ queryKey: deliveryPersonnelKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deliveryPersonnelKeys.detail(variables.id) });
      toast.success(response.message || 'Delivery personnel updated successfully!');
    },
    onError: (error) => {
      console.error('useUpdateDeliveryPersonnel: Error:', error);
      console.error('useUpdateDeliveryPersonnel: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to update delivery personnel');
    },
  });
};

export const useUpdateDeliveryStats = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => {
      console.log('useUpdateDeliveryStats: Updating stats with id:', id, 'data:', data);
      return deliveryPersonnelAPI.updateStats(id, data);
    },
    onSuccess: (response, variables) => {
      console.log('useUpdateDeliveryStats: Success response:', response);
      queryClient.invalidateQueries({ queryKey: deliveryPersonnelKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deliveryPersonnelKeys.detail(variables.id) });
      toast.success(response.message || 'Delivery statistics updated successfully!');
    },
    onError: (error) => {
      console.error('useUpdateDeliveryStats: Error:', error);
      console.error('useUpdateDeliveryStats: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to update delivery statistics');
    },
  });
};

export const useDeleteDeliveryPersonnel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => {
      console.log('useDeleteDeliveryPersonnel: Deleting delivery personnel with id:', id);
      return deliveryPersonnelAPI.delete(id);
    },
    onSuccess: (response) => {
      console.log('useDeleteDeliveryPersonnel: Success response:', response);
      queryClient.invalidateQueries({ queryKey: deliveryPersonnelKeys.lists() });
      toast.success(response.message || 'Delivery personnel deleted successfully!');
    },
    onError: (error) => {
      console.error('useDeleteDeliveryPersonnel: Error:', error);
      console.error('useDeleteDeliveryPersonnel: Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to delete delivery personnel');
    },
  });
};
