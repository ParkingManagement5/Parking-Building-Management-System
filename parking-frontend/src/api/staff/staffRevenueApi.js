import axios from "axios";

/**
 * GET /api/v1/dashboard/staff/revenue/today
 * Doanh thu trong ngày của staff tại bãi được gán.
 */
export const staffRevenueApi = {
  getToday: () => axios.get("/api/v1/dashboard/staff/revenue/today"),
};
