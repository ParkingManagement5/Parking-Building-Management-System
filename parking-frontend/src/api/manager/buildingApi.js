import axiosClient from "../axiosClient";

export const buildingApi = {
  getAll: () => axiosClient.get("/parking-buildings"),
  getById: (id) => axiosClient.get(`/parking-buildings/${id}`),
  getAvailability: () => axiosClient.get("/parking-buildings/availability"),
  create: (data) => axiosClient.post("/parking-buildings", data),
  update: (id, data) => axiosClient.put(`/parking-buildings/${id}`, data),
  delete: (id) => axiosClient.delete(`/parking-buildings/${id}`),
};