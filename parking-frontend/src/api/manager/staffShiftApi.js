import axiosClient from "../axiosClient";
export const staffShiftApi = {
  getAll: () => axiosClient.get("/staff-shifts"),
  getByUser: (userId) => axiosClient.get(`/staff-shifts/user/${userId}`),
  getByDate: (workingDate) => axiosClient.get(`/staff-shifts/date/${workingDate}`),

  getById: (id) => axiosClient.get(`/staff-shifts/${id}`),

  create: (data) => axiosClient.post("/staff-shifts", data),

  update: (id, data) => axiosClient.put(`/staff-shifts/${id}`, data),

  delete: (id) => axiosClient.delete(`/staff-shifts/${id}`),

  checkIn: (id) => axiosClient.post(`/staff-shifts/${id}/check-in`),
  checkOut: (id) => axiosClient.post(`/staff-shifts/${id}/check-out`),
};
