import axiosInstance from "../axiosClient";

export const revenueApi = {
  // year only → monthly breakdown; year + month → daily breakdown
  getRevenue: (year, month = null) =>
    axiosInstance.get("/dashboard/revenue", { params: month ? { year, month } : { year } }),
};
