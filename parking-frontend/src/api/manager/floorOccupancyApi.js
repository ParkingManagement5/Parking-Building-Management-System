import axiosInstance from "../axiosClient";

export const floorOccupancyApi = {
  getFloorOccupancy: () => axiosInstance.get("/dashboard/floor-occupancy"),
};
