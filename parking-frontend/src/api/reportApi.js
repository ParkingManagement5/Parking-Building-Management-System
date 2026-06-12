import axiosClient from "./axiosClient";

export const reportApi = {
  getOccupancyReport: () => axiosClient.get("/reports/occupancy"),

  getRevenueReport: () => axiosClient.get("/reports/revenue"),

  getSessionReport: () => axiosClient.get("/reports/sessions"),
};