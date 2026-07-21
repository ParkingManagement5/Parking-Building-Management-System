import axiosClient from "../axiosClient";

export const driverSessionApi = {
  getMySessions: () => axiosClient.get("/sessions/my"),
};
