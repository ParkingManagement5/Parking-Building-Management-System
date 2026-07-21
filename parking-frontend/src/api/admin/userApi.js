import axiosClient from "../axiosClient";

export const userApi = {
  getAll: (role) =>
    role ? axiosClient.get(`/users?role=${role}`) : axiosClient.get("/users"),

  getById: (id) => axiosClient.get(`/users/${id}`),

  create: (data) => axiosClient.post("/users", data),

  update: (id, data) => axiosClient.put(`/users/${id}`, data),

  lock: (id) => axiosClient.put(`/users/${id}/lock`),

  unlock: (id) => axiosClient.put(`/users/${id}/unlock`),
};
