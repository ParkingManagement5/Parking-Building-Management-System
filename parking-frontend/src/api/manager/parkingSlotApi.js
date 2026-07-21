import axiosClient from "../axiosClient";

export const parkingSlotApi = {
  getAll: () => axiosClient.get("/slots/all"),
  getByZone: (zoneId) => axiosClient.get(`/slots/zone/${zoneId}`),
  search: (buildingId, vehicleTypeId) => axiosClient.get(`/slots/search?buildingId=${buildingId}&vehicleTypeId=${vehicleTypeId}`),
  getById: (id) => axiosClient.get(`/slots/${id}`),
  create: (data) => axiosClient.post("/slots", data),
  update: (id, data) => axiosClient.put(`/slots/${id}`, data),
  delete: (id) => axiosClient.delete(`/slots/${id}`),
};
