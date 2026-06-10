import axiosClient from "./axiosClient";

export const paymentApi = {
  getMyPayments: () => axiosClient.get("/me/payments"),

  createPayment: (data) => axiosClient.post("/payments", data),

  getById: (id) => axiosClient.get(`/payments/${id}`),
};