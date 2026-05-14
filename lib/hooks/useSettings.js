import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as settingsApi from "../api/endpoints/settings";
import toast from "react-hot-toast";

export const useSettings = () => {
  return useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.getSettings,
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings updated successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update settings");
    },
  });
};
