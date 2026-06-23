import axiosClient from "../axiosClient";

export const sessionApi = {
  entry: (data) => axiosClient.post("/sessions/entry", data),
  getSessions: (params = {}) => axiosClient.get("/sessions", { params }),
  getById: (id) => axiosClient.get(`/sessions/${id}`),
  exit: (id, data) => axiosClient.post(`/sessions/${id}/exit`, data),
  exitByQr: (data) => axiosClient.post("/sessions/exit/qr", data),
  createExitQr: (id) => axiosClient.post(`/sessions/${id}/exit-qr`),
  getMySessions: () => axiosClient.get("/sessions/my"),
};
