import axiosClient from "../axiosClient";

export const authApi = {
  login: (data) => axiosClient.post("/auth/login", data),

  googleLogin: (data) => axiosClient.post("/auth/google", data),

  register: (data) => axiosClient.post("/auth/register", data),

  verifyEmail: (data) => axiosClient.post("/auth/verify-email", data),

  resendVerification: (data) => axiosClient.post("/auth/resend-verification", data),

  forgotPassword: (data) => axiosClient.post("/auth/forgot-password", data),

  resetPassword: (data) => axiosClient.post("/auth/reset-password", data),
};
