import { Outlet } from "react-router-dom";
import PublicNavbar from "../components/public/PublicNavbar";

export default function PublicLayout() {
  return (
    <div>
      <PublicNavbar />
      <Outlet />
    </div>
  );
}