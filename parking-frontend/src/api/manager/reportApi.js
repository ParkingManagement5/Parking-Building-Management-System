import axiosClient from "../axiosClient";

export const reportApi = {
  getRevenue: (params = {}) => axiosClient.get("/reports/revenue", { params }),
};
