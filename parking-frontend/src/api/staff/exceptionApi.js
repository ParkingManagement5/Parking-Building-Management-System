import axiosClient from "../axiosClient";

export const exceptionApi = {
  create: (payload) => axiosClient.post("/exceptions", payload),

  getById: (id) => axiosClient.get(`/exceptions/${id}`),

  getByStatus: (status) => axiosClient.get(`/exceptions/status/${status}`),

  getByType: (type) => axiosClient.get(`/exceptions/type/${type}`),

  getBySession: (sessionId) => axiosClient.get(`/exceptions/session/${sessionId}`),

  getByRequest: (requestId) => axiosClient.get(`/exceptions/request/${requestId}`),

  assign: (id, staffId) =>
    axiosClient.put(`/exceptions/${id}/assign`, null, {
      params: { staffId },
    }),

  resolve: (id) => axiosClient.put(`/exceptions/${id}/resolve`),

  close: (id) => axiosClient.put(`/exceptions/${id}/close`),
};
