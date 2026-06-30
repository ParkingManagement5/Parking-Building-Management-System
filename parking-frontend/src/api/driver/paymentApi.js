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

  createParkingFee: ({
    sessionId,
    bookingId,
    policyId,
    appliedRate,
    baseFee,
    overtimeFee = 0,
    penaltyFee = 0,
    discount = 0,
    depositDeducted = 0,
    totalAmount,
    paymentMethod = "CASH",
  }) =>
    axiosClient.post("/payments/parking-fee", null, {
      params: {
        sessionId,
        bookingId,
        policyId,
        appliedRate,
        baseFee,
        overtimeFee,
        penaltyFee,
        discount,
        depositDeducted,
        totalAmount,
        paymentMethod,
      },
    }),

  confirmParkingFee: (paymentId, transactionRef) =>
    axiosClient.put(`/payments/parking-fee/${paymentId}/confirm`, null, {
      params: transactionRef ? { transactionRef } : {},
    }),

  createPayment: (data) => axiosClient.post("/payments", data),

  getById: (id) => axiosClient.get(`/payments/${id}`),

  getBySessionId: (sessionId) => axiosClient.get(`/payments/session/${sessionId}`),

  getByStatus: (status) => axiosClient.get(`/payments/status/${status}`),

  // VNPay
  createVnpayDepositUrl: (bookingId) =>
    axiosClient.post(`/payments/vnpay/create-deposit/${bookingId}`),

  createVnpayParkingFeeUrl: (sessionId) =>
    axiosClient.post(`/payments/vnpay/create-parking-fee/${sessionId}`),

  confirmVnpayReturn: (params) =>
    axiosClient.get("/payments/vnpay/return", { params }),
};
