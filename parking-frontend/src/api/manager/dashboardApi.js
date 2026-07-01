import axiosClient from "../axiosClient";

export const dashboardApi = {
  getManagerStats: () => axiosClient.get("/dashboard/manager"),
};
