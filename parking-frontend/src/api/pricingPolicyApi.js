import axiosClient from "./axiosClient";

export const pricingPolicyApi = {
  getAll: () => axiosClient.get("/pricing-policies"),

  getById: (id) => axiosClient.get(`/pricing-policies/${id}`),

  create: (data) => axiosClient.post("/pricing-policies", data),

  update: (id, data) => axiosClient.put(`/pricing-policies/${id}`, data),

  delete: (id) => axiosClient.delete(`/pricing-policies/${id}`),
};