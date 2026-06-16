import { Outlet } from "react-router-dom";
import MainPublicNavbar from "../ui/components/MainPublicNavbar";

export default function MainPublicLayout() {
  return (
    <>
      <MainPublicNavbar />
      <main>
        <Outlet />
      </main>
    </>
  );
}
