export function unwrapApiData(payload, fallback = []) {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data ?? fallback;
  }

  return payload ?? fallback;
}
