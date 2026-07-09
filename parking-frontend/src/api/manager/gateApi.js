import axiosClient from "../axiosClient";

export const gateApi = {
  getByBuilding: (buildingId) => axiosClient.get(`/gates?buildingId=${buildingId}`),
  getActiveByBuilding: (buildingId) => axiosClient.get(`/gates/active?buildingId=${buildingId}`),
  getById: (id) => axiosClient.get(`/gates/${id}`),
  create: (data) => axiosClient.post("/gates", data),
  update: (id, data) => axiosClient.put(`/gates/${id}`, data),
  delete: (id) => axiosClient.delete(`/gates/${id}`),
};
