import axiosClient from "../axiosClient";

export const userApi = {
  getAll: (role) =>
    role ? axiosClient.get(`/users?role=${role}`) : axiosClient.get("/users"),
  changeRole: (id, roleName) => axiosClient.put(`/users/${id}/role`, { roleName }),
  changeStatus: (id, status) => axiosClient.put(`/users/${id}/status`, { status }),
  assignBuilding: (id, buildingId) =>
    buildingId
      ? axiosClient.put(`/users/${id}/assign-building?buildingId=${buildingId}`)
      : axiosClient.put(`/users/${id}/assign-building`),
};
