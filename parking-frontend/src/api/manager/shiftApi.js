import axiosClient from "../axiosClient";

export const shiftApi = {
  getAll: () => axiosClient.get("/shifts"),
  getById: (id) => axiosClient.get(`/shifts/${id}`),
  create: (data) => axiosClient.post("/shifts", data),
  update: (id, data) => axiosClient.put(`/shifts/${id}`, data),
  delete: (id) => axiosClient.delete(`/shifts/${id}`),
};
