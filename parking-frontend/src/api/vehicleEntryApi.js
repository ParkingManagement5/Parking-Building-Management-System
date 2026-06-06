import axiosClient from "./axiosClient";

export const vehicleEntryApi = {
  createEntry: (data) => axiosClient.post("/vehicle-entry", data),

  verifyQr: (qrCode) => axiosClient.post("/vehicle-entry/verify-qr", { qrCode }),

  scanOcr: (data) => axiosClient.post("/vehicle-entry/ocr-scan", data),
};
