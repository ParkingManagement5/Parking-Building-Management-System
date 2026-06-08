import axiosClient from "./axiosClient";

export const notificationApi = {
  getAll: () => axiosClient.get("/notifications"),

  getById: (id) => axiosClient.get(`/notifications/${id}`),

  markAsRead: (id) => axiosClient.put(`/notifications/${id}/read`),

  delete: (id) => axiosClient.delete(`/notifications/${id}`),
};