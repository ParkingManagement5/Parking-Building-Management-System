import axiosClient from "../axiosClient";

export const vehicleTypeApi = {
  getAll: () => axiosClient.get("/vehicle-types"),
  getById: (id) => axiosClient.get(`/vehicle-types/${id}`),
  create: (data) => axiosClient.post("/vehicle-types", data),
  update: (id, data) => axiosClient.put(`/vehicle-types/${id}`, data),
  delete: (id) => axiosClient.delete(`/vehicle-types/${id}`),
};