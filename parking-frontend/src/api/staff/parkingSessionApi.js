import axiosClient from "../axiosClient";

export const parkingSessionApi = {
  getAll: () =>
    axiosClient.get("/parking-sessions"),

  getById: (id) =>
    axiosClient.get(`/parking-sessions/${id}`),

  checkOut: (id) =>
    axiosClient.put(`/parking-sessions/${id}/checkout`),
};