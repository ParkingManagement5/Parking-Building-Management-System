import axiosClient from "./axiosClient";

export const vehicleTypeApi = {
  getAll: () => {
    return axiosClient.get("/vehicle-types");
  },

  getById: (id) => {
    return axiosClient.get(`/vehicle-types/${id}`);
  },

  create: (data) => {
    return axiosClient.post("/vehicle-types", data);
  },

  update: (id, data) => {
    return axiosClient.put(`/vehicle-types/${id}`, data);
  },

  delete: (id) => {
    return axiosClient.delete(`/vehicle-types/${id}`);
  },
};