export const saveToken = (token) => {
  localStorage.setItem("token", token);
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export const saveRole = (role) => {
  localStorage.setItem("role", role);
};

export const getRole = () => {
  return localStorage.getItem("role");
};

export const saveUserId = (userId) => {
  localStorage.setItem("userId", String(userId));
};

export const getUserId = () => {
  return localStorage.getItem("userId");
};

export const saveUsername = (username) => {
  localStorage.setItem("username", username);
};

export const getUsername = () => {
  return localStorage.getItem("username");
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
};
