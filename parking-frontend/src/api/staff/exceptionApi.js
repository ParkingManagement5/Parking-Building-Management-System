import axiosClient from "../axiosClient";

export const exceptionApi = {
  create: (payload) => axiosClient.post("/exceptions", payload),

  getByStatus: (status) => axiosClient.get(`/exceptions/status/${status}`),

  assign: (id, staffId) =>
    axiosClient.put(`/exceptions/${id}/assign`, null, {
      params: { staffId },
    }),

  resolve: (id) => axiosClient.put(`/exceptions/${id}/resolve`),

  close: (id) => axiosClient.put(`/exceptions/${id}/close`),
};
