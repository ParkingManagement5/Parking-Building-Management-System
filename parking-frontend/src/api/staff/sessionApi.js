import axiosClient from "../axiosClient";

export const sessionApi = {
  entry: (data) => axiosClient.post("/sessions/entry", data),
  getSessions: (params = {}) => axiosClient.get("/sessions", { params }),
  getById: (id) => axiosClient.get(`/sessions/${id}`),
  getActiveByPlate: (plate) => axiosClient.get(`/sessions/by-plate/${encodeURIComponent(plate)}`),
  exit: (id, data) => axiosClient.post(`/sessions/${id}/exit`, data),
  getMySessions: () => axiosClient.get("/sessions/my"),
};
