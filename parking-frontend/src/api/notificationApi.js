import axiosClient from "./axiosClient";

export const notificationApi = {
  getByUser: (userId) => axiosClient.get(`/notifications/user/${userId}`),

  markAsRead: (id) => axiosClient.patch(`/notifications/${id}/read`),

  markAllAsRead: (userId) => axiosClient.patch(`/notifications/user/${userId}/read-all`),
};
