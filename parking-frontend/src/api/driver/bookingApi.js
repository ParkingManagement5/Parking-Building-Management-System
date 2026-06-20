import axios from "axios";
import axiosClient from "../axiosClient";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";
const directClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

directClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function bookingUrl(path = "") {
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";

  if (/^https?:\/\//i.test(apiBase)) {
    return `${apiBase.replace(/\/api\/v1\/?$/, "")}/api/bookings${normalizedPath}`;
  }

  return `/api/bookings${normalizedPath}`;
}

export const bookingApi = {
  getAvailableSlots: (vehicleTypeId) =>
    axiosClient.get("/slots/available", {
      params: { vehicleTypeId },
    }),

  create: (data) => directClient.post(bookingUrl(), data),

  getMyBookings: () => directClient.get(bookingUrl("/my")),

  cancel: (id) => directClient.put(bookingUrl(`/${id}/cancel`)),
};
