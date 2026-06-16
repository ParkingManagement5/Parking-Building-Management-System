import axiosClient from "../axiosClient";

export const paymentApi = {
  getMyPayments: () => axiosClient.get("/payments/my"),

  createDeposit: ({ bookingId, depositAmount, paymentMethod = "CASH" }) =>
    axiosClient.post("/payments/deposit", null, {
      params: {
        bookingId,
        depositAmount,
        paymentMethod,
      },
    }),

  confirmDeposit: (paymentId) => axiosClient.put(`/payments/deposit/${paymentId}/confirm`),

  createPayment: (data) => axiosClient.post("/payments", data),

  getById: (id) => axiosClient.get(`/payments/${id}`),
};
