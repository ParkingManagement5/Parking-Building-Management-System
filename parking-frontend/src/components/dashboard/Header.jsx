import { getRole, getUsername, logout } from "../../utils/auth";

const ROLE_LABELS = {
  ADMIN: "Administrator",
  MANAGER: "Parking Manager",
  STAFF: "Parking Staff",
  DRIVER: "Driver",
};

export default function Header() {
  const username = String(getUsername() || "User");
  const role = getRole() || "USER";
  const avatarText = username.charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <header className="header">
      <div>
        <h3>Dashboard</h3>
        <p>Overview of parking building system</p>
      </div>

      <div className="header-actions">
        <button type="button" className="secondary-btn header-logout" onClick={handleLogout}>
          Logout
        </button>

        <div className="user-info">
          <div className="user-text">
            <strong>{username}</strong>
            <span>{ROLE_LABELS[role] || role}</span>
          </div>

          <div className="avatar">{avatarText}</div>
        </div>
      </div>
    </header>
  );
}
