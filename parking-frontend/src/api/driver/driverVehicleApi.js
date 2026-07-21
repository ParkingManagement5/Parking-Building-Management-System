import axiosClient from "../axiosClient";

export const driverVehicleApi = {
  getMyVehicles: () => axiosClient.get("/vehicles/my"),

  create: (data) => axiosClient.post("/vehicles", data),

  update: (id, data) => axiosClient.put(`/vehicles/${id}`, data),

  delete: (id) => axiosClient.delete(`/vehicles/${id}`),
};
