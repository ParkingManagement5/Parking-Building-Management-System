import axiosClient from "../axiosClient";

export const parkingSlotApi = {
  getByZone: (zoneId) => axiosClient.get(`/slots/zone/${zoneId}`),
  getById: (id) => axiosClient.get(`/slots/${id}`),
  create: (data) => axiosClient.post("/slots", data),
  update: (id, data) => axiosClient.put(`/slots/${id}`, data),
  delete: (id) => axiosClient.delete(`/slots/${id}`),
};
