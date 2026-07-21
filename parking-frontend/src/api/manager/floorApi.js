import axiosClient from "../axiosClient";

export const floorApi = {
  getAll: () => axiosClient.get("/floors"),
  getByBuilding: (buildingId) => axiosClient.get(`/floors/building/${buildingId}`),
  getById: (id) => axiosClient.get(`/floors/${id}`),
  create: (data) => axiosClient.post("/floors", data),
  update: (id, data) => axiosClient.put(`/floors/${id}`, data),
  delete: (id) => axiosClient.delete(`/floors/${id}`),
};
