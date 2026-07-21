import axiosClient from "../axiosClient";

export const ocrApi = {
  getPendingReviews: () => axiosClient.get("/ocr/pending-reviews"),

  review: (scanId, { correctedPlate, staffUserId }) =>
    axiosClient.put(`/ocr/${scanId}/review`, null, {
      params: {
        correctedPlate,
        staffUserId,
      },
    }),
};
