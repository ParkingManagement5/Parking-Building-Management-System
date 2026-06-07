import { NavLink } from "react-router-dom";

export default function PublicNavbar() {
  return (
    <nav className="public-navbar">
      <div className="public-logo">Parking System</div>

      <div className="public-menu">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/parking-info">Parking Information</NavLink>
        <NavLink to="/public-slots">Parking Slots</NavLink>
      </div>

      <div className="public-actions">
        <NavLink to="/login" className="login-link">
          Login
        </NavLink>
        <NavLink to="/register" className="register-btn">
          Register
        </NavLink>
      </div>
    </nav>
  );
}