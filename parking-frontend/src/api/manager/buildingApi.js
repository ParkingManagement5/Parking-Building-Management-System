import axiosClient from "../axiosClient";

export const buildingApi = {
  getAll: () => axiosClient.get("/buildings"),

  getById: (id) => axiosClient.get(`/buildings/${id}`),

  create: (data) => axiosClient.post("/buildings", data),

  update: (id, data) => axiosClient.put(`/buildings/${id}`, data),

  delete: (id) => axiosClient.delete(`/buildings/${id}`),
};