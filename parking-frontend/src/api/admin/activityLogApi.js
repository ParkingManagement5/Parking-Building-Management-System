import axiosClient from "../axiosClient";

export const activityLogApi = {
  getAll: () => axiosClient.get("/activity-logs"),

  getByUser: (userId) => axiosClient.get(`/activity-logs/user/${userId}`),
};