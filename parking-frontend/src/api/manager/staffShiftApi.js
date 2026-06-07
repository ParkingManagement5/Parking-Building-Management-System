import axiosClient from "../axiosClient";
export const staffShiftApi = {
  getAll: () => axiosClient.get("/staff-shifts"),

  getById: (id) => axiosClient.get(`/staff-shifts/${id}`),

  create: (data) => axiosClient.post("/staff-shifts", data),

  update: (id, data) => axiosClient.put(`/staff-shifts/${id}`, data),

  delete: (id) => axiosClient.delete(`/staff-shifts/${id}`),
};