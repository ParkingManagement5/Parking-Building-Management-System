import axiosClient from "./axiosClient";

export const authApi = {
  login: (data) => {
    return axiosClient.post("/auth/login", data);
  },

  register: (data) => {
    return axiosClient.post("/auth/register", data);
  },

  getCurrentUser: () => {
    return axiosClient.get("/auth/me");
  },
};