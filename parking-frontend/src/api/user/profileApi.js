import axiosClient from "../axiosClient";

export const profileApi = {
  getMe: () => axiosClient.get("/users/me"),

  updateMe: (data) => axiosClient.put("/users/me", data),

  changePassword: (data) => axiosClient.put("/users/me/password", data),
};
