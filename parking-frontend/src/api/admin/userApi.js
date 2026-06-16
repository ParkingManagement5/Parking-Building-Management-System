import axiosClient from "../axiosClient";

export const userApi = {
  getAll: (role) =>
    role ? axiosClient.get(`/users?role=${role}`) : axiosClient.get("/users"),
  changeRole: (id, roleName) => axiosClient.put(`/users/${id}/role`, { roleName }),
};
