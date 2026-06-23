import axiosClient from "../axiosClient";

export const requestApi = {
  getMyRequests: () => axiosClient.get("/requests/my"),

  create: (data) => axiosClient.post("/requests", data),

  getAllForStaff: () => axiosClient.get("/requests"),

  getByStatus: (status) => axiosClient.get(`/requests/status/${status}`),

  assign: (id, staffId) =>
    axiosClient.put(`/requests/${id}/assign`, null, {
      params: { staffId },
    }),

  resolve: (id) => axiosClient.put(`/requests/${id}/resolve`),

  close: (id) => axiosClient.put(`/requests/${id}/close`),

  updateStatus: (id, status) =>
    axiosClient.put(`/requests/${id}/status`, { status }),
};
