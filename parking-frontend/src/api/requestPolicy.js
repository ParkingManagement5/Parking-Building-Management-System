const PUBLIC_GET_PREFIXES = [
  "/parking-buildings",
  "/vehicle-types",
  "/gates",
  "/floors/building/",
  "/zones/floor/",
  "/slots/zone/",
];

const PUBLIC_ANY_METHOD_PREFIXES = [
  "/auth/",
];

export function shouldSkipAuth(config) {
  const method = String(config?.method || "get").toLowerCase();
  const url = String(config?.url || "");

  if (PUBLIC_ANY_METHOD_PREFIXES.some((prefix) => url.startsWith(prefix))) {
    return true;
  }

  if (method !== "get") {
    return false;
  }

  return PUBLIC_GET_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export function applySharedRequestPolicy(config) {
  const nextConfig = config;
  const token = localStorage.getItem("token");
  const currentHostname =
    typeof window !== "undefined" ? window.location.hostname : "";

  if (!nextConfig.headers) {
    nextConfig.headers = {};
  }

  if (shouldSkipAuth(nextConfig)) {
    delete nextConfig.headers.Authorization;
  } else if (token) {
    nextConfig.headers.Authorization = `Bearer ${token}`;
  }

  if (currentHostname.includes("ngrok")) {
    nextConfig.headers["ngrok-skip-browser-warning"] = "true";
  }

  return nextConfig;
}
