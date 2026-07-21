import axiosClient from "../axiosClient";

export const reportApi = {
  getRevenue: (params = {}) => axiosClient.get("/reports/revenue", { params }),
  getTimeSeries: (params = {}) => axiosClient.get("/reports/revenue/time-series", { params }),
};
