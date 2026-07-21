export function unwrapApiData(payload, fallback = []) {
  // Backend dung @JsonInclude(NON_NULL): khi data la null, key "data" bi luoc
  // bo hoan toan khoi JSON (khong con "data" in payload). Van phai nhan dien
  // day la ApiResponse wrapper qua key "success"/"message" de tra ve fallback,
  // thay vi tra nham nguyen wrapper {success, message} lam du lieu that.
  if (payload && typeof payload === "object" && ("data" in payload || "success" in payload)) {
    return payload.data ?? fallback;
  }

  return payload ?? fallback;
}
