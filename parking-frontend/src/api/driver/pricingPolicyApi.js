import axiosClient from "../axiosClient";

export const pricingPolicyApi = {
  getAll: () => axiosClient.get("/pricing"),
};
