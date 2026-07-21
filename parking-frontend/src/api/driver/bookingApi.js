import axiosClient from "../axiosClient";

export const bookingApi = {
  getAvailableSlots: (vehicleTypeId) =>
    axiosClient.get("/slots/available", {
      params: { vehicleTypeId },
    }),

  create: (data) => axiosClient.post("/bookings", data),

  getMyBookings: () => axiosClient.get("/bookings/my"),

  verifyQr: (qrToken) =>
    axiosClient.post("/bookings/verify-qr", null, {
      params: { qrToken },
    }),

  cancel: (id) => axiosClient.put(`/bookings/${id}/cancel`),

  regenerateQr: (id) => axiosClient.put(`/bookings/${id}/regenerate-qr`),
};
