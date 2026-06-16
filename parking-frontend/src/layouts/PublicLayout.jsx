import { Outlet } from "react-router-dom";
import PublicNavbar from "../pages/public/PublicNavbar";

export default function PublicLayout() {
  return (
    <>
      <PublicNavbar />

      <main>
        <Outlet />
      </main>
    </>
  );
}
