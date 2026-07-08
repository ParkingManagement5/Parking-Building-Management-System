import axiosClient from "./axiosClient";

export const notificationApi = {
  send: (payload) => axiosClient.post("/notifications", payload),

  broadcast: (payload) => axiosClient.post("/notifications/broadcast", payload),

  getByUser: (userId) => axiosClient.get(`/notifications/user/${userId}`),

  markAsRead: (id) => axiosClient.patch(`/notifications/${id}/read`),

  markAllAsRead: (userId) => axiosClient.patch(`/notifications/user/${userId}/read-all`),
};
