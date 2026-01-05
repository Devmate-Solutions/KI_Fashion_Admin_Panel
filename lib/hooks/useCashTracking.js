import { useQuery } from '@tanstack/react-query';
import { cashTrackingAPI } from '../api/endpoints/cashTracking';

// Query Keys
export const cashTrackingKeys = {
  all: ['cash-tracking'],
  daily: (date) => [...cashTrackingKeys.all, 'daily', date],
  range: (startDate, endDate) => [...cashTrackingKeys.all, 'range', startDate, endDate],
};

// Get daily cash summary
export const useDailyCashSummary = (date) => {
  return useQuery({
    queryKey: cashTrackingKeys.daily(date),
    queryFn: () => cashTrackingAPI.getDaily(date),
    select: (response) => {
      return response.data?.data || null;
    },
    enabled: !!date,
  });
};

// Get cash range summary
export const useCashRange = (startDate, endDate) => {
  return useQuery({
    queryKey: cashTrackingKeys.range(startDate, endDate),
    queryFn: () => cashTrackingAPI.getRange(startDate, endDate),
    select: (response) => {
      return response.data?.data || null;
    },
    enabled: !!startDate && !!endDate,
  });
};

