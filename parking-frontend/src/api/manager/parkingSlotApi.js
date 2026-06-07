import axiosClient from "../axiosClient";

export const parkingSlotApi = {
  getAll: () => axiosClient.get("/parking-slots"),

  getById: (id) => axiosClient.get(`/parking-slots/${id}`),

  create: (data) => axiosClient.post("/parking-slots", data),

  update: (id, data) => axiosClient.put(`/parking-slots/${id}`, data),

  delete: (id) => axiosClient.delete(`/parking-slots/${id}`),
};