import axiosClient from "../axiosClient";

export const driverSessionApi = {
  getMySessions: () => axiosClient.get("/sessions/my"),
  createExitQr: (sessionId) => axiosClient.post(`/sessions/${sessionId}/exit-qr`),
};
