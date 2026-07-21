import { LayoutGrid } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function PublicNavbar() {
  return (
    <nav className="public-navbar">
      <div className="public-menu">
        <NavLink to="/parking-info">Parking Info</NavLink>
        <NavLink to="/" className="public-brand public-menu-brand">
          <span className="public-brand-icon">
            <LayoutGrid size={16} />
          </span>
          <span className="public-brand-name">ParkSmart</span>
        </NavLink>
        <NavLink to="/public-slots">Public Slots</NavLink>
      </div>
    </nav>
  );
}
