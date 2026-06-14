import axiosClient from "../axiosClient";

export const roleApi = {
  getAll: () => axiosClient.get("/roles"),
};
