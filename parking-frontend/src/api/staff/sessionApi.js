import axios from "axios";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

const directClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

directClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function sessionUrl(path = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (/^https?:\/\//i.test(apiBase)) {
    return `${apiBase.replace(/\/api\/v1\/?$/, "")}/api/sessions${normalizedPath}`;
  }

  return `/api/sessions${normalizedPath}`;
}

export const sessionApi = {
  entry: (data) => directClient.post(sessionUrl("/entry"), data),
};
