import { Navigate, Outlet } from "react-router-dom";
import { getRole, getToken } from "../utils/auth";

export default function ProtectedRoute({ allowedRoles }) {
  const token = getToken();
  const role = String(getRole() || "")
    .replace("ROLE_", "")
    .toUpperCase();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
