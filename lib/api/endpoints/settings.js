import api from "../client";

export const getSettings = async () => {
  const response = await api.get("/settings");
  return response.data.data;
};

export const updateSettings = async (data) => {
  const response = await api.put("/settings", data);
  return response.data.data;
};
