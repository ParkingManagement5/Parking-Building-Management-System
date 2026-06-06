import axiosClient from "./axiosClient";

export const systemConfigApi = {
  getAll: () => axiosClient.get("/system-configs"),

  getById: (id) => axiosClient.get(`/system-configs/${id}`),

  create: (data) => axiosClient.post("/system-configs", data),

  update: (id, data) => axiosClient.put(`/system-configs/${id}`, data),

  delete: (id) => axiosClient.delete(`/system-configs/${id}`),
};