import axiosClient from "./axiosClient";

export const requestApi = {
  getMyRequests: () => axiosClient.get("/me/requests"),

  create: (data) => axiosClient.post("/requests", data),

  getAllForStaff: () => axiosClient.get("/requests"),

  updateStatus: (id, status) =>
    axiosClient.put(`/requests/${id}/status`, { status }),
};