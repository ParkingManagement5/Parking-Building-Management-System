import axiosClient from "../axiosClient";

export const bookingApi = {
  getAvailableSlots: () => axiosClient.get("/bookings/available-slots"),

  create: (data) => axiosClient.post("/bookings", data),

  getMyBookings: () => axiosClient.get("/me/bookings"),

  cancel: (id) => axiosClient.put(`/bookings/${id}/cancel`),
};