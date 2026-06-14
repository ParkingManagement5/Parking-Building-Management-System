import axiosClient from "../axiosClient";

export const pricingPolicyApi = {
  getAll: () => axiosClient.get("/pricing"),

  getById: (id) => axiosClient.get(`/pricing/${id}`),

  create: (data) => axiosClient.post("/pricing", data),

  update: (id, data) => axiosClient.put(`/pricing/${id}`, data),

  delete: (id) => axiosClient.delete(`/pricing/${id}`),

  activate: (id) => axiosClient.patch(`/pricing/${id}/activate`),
};
