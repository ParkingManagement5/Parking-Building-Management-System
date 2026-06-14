import axiosClient from "../axiosClient";

export const systemConfigApi = {
  getAll: () => axiosClient.get("/system-configs"),

  getById: (id) => axiosClient.get(`/system-configs/${id}`),

  create: (data, updatedBy) =>
    axiosClient.post(`/system-configs?updatedBy=${updatedBy}`, data),

  update: (id, data, updatedBy) =>
    axiosClient.put(`/system-configs/${id}?updatedBy=${updatedBy}`, data),

  delete: (id) => axiosClient.delete(`/system-configs/${id}`),
};
