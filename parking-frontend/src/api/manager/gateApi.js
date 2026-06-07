import axiosClient from "../axiosClient";

export const gateApi = {
  getAll: () => axiosClient.get("/gates"),

  getById: (id) => axiosClient.get(`/gates/${id}`),

  create: (data) => axiosClient.post("/gates", data),

  update: (id, data) => axiosClient.put(`/gates/${id}`, data),

  delete: (id) => axiosClient.delete(`/gates/${id}`),
};