import axiosClient from "./axiosClient";

export const driverVehicleApi = {
  getMyVehicles: () => axiosClient.get("/me/vehicles"),

  create: (data) => axiosClient.post("/me/vehicles", data),

  update: (id, data) => axiosClient.put(`/me/vehicles/${id}`, data),

  delete: (id) => axiosClient.delete(`/me/vehicles/${id}`),
};