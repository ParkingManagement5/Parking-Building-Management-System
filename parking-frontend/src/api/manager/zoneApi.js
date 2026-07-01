import axiosClient from "../axiosClient";

export const zoneApi = {
  getAll: () => axiosClient.get("/zones"),
  getByFloor: (floorId) => axiosClient.get(`/zones/floor/${floorId}`),
  getById: (id) => axiosClient.get(`/zones/${id}`),
  create: (data) => axiosClient.post("/zones", data),
  update: (id, data) => axiosClient.put(`/zones/${id}`, data),
  delete: (id) => axiosClient.delete(`/zones/${id}`),
};
