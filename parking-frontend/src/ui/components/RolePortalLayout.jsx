import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { notificationApi } from "../../api/notificationApi";
import { getRole, getUserId, getUsername } from "../../utils/auth";
import { unwrapApiData } from "../../utils/api";
import { usePublicTheme } from "../../utils/publicTheme";
import "../../assets/css/landing.css";
import "../../assets/css/dashboard.css";

const CONFIG = {
  driver: {
    basePath: "/driver",
    role: "driver",
    label: "Driver Portal",
    menuGroups: [
      { label: "Tổng quan", items: [{ id: "overview", label: "Dashboard" }] },
      {
        label: "Đỗ xe", items: [
          { id: "booking", label: "Đặt chỗ" },
          { id: "current-session", label: "Phiên hiện tại" },
          { id: "parking-map", label: "Bản đồ bãi" },
        ],
      },
      {
        label: "Hồ sơ", items: [
          { id: "bookings", label: "Lịch sử đặt" },
          { id: "payments", label: "Thanh toán" },
          { id: "vehicles", label: "Xe của tôi" },
        ],
      },
      {
        label: "Tài khoản", items: [
          { id: "requests", label: "Yêu cầu hỗ trợ" },
          { id: "notifications", label: "Thông báo" },
          { id: "profile", label: "Hồ sơ" },
        ],
      },
    ],
  },
  staff: {
    basePath: "/staff",
    role: "staff",
    label: "Staff Portal",
    menuGroups: [
      { label: "Tổng quan", items: [{ id: "overview", label: "Dashboard" }] },
      {
        label: "Vận hành", items: [
          { id: "scan", label: "Scan" },
          { id: "gate", label: "Bản đồ bãi" },
          { id: "sessions", label: "Sessions" },
          { id: "payments", label: "Thanh toán" },
        ],
      },
      {
        label: "Xử lý", items: [
          { id: "exceptions", label: "Ngoại lệ" },
          { id: "requests", label: "Yêu cầu" },
          { id: "notifications", label: "Thông báo" },
        ],
      },
    ],
  },
  manager: {
    basePath: "/manager",
    role: "manager",
    label: "Manager Portal",
    menuGroups: [
      { label: "Tổng quan", items: [{ id: "overview", label: "Dashboard" }] },
      {
        label: "Cơ sở hạ tầng", items: [
          { id: "buildings", label: "Tòa nhà" },
          { id: "floors", label: "Tầng" },
          { id: "zones", label: "Zone" },
          { id: "parking-slots", label: "Slot" },
          { id: "gates", label: "Cổng" },
        ],
      },
      {
        label: "Cấu hình", items: [
          { id: "vehicle-types", label: "Loại xe" },
          { id: "pricing-policies", label: "Bảng giá" },
          { id: "staff-shifts", label: "Ca làm việc" },
          { id: "notifications", label: "Thông báo" },
        ],
      },
    ],
  },
  admin: {
    basePath: "/admin",
    role: "admin",
    label: "Admin Portal",
    menuGroups: [
      { label: "Tổng quan", items: [{ id: "overview", label: "Dashboard" }] },
      {
        label: "Hệ thống", items: [
          { id: "users", label: "Người dùng" },
          { id: "roles", label: "Vai trò" },
          { id: "system-config", label: "Cấu hình" },
        ],
      },
    ],
  },
};

const ROLE_COLORS = {
  driver: "#3b82f6",
  staff: "#10b981",
  manager: "#8b5cf6",
  admin: "#ef4444",
};

function initialsFromName(name) {
  const parts = String(name || "U").trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "U";
}

export default function RolePortalLayout({ portal }) {
  const navigate = useNavigate();
  const location = useLocation();
  const config = CONFIG[portal];
  const { dark, toggle, className: themeClass } = usePublicTheme();
  const username = getUsername() || "User";
  const role = getRole() || portal.toUpperCase();
  const userId = getUserId();

  const [notifications, setNotifications] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navRef = useRef(null);

  const currentPage = location.pathname.replace(`${config.basePath}/`, "").replace(config.basePath, "") || "overview";
  const pageKey = currentPage === "/" || currentPage === "" ? "overview" : currentPage;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) return;
      try {
        const res = await notificationApi.getByUser(userId);
        if (!cancelled) setNotifications(unwrapApiData(res.data, []));
      } catch { if (!cancelled) setNotifications([]); }
    }
    load();
    const iv = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [userId, location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (!navRef.current?.contains(e.target)) {
        setOpenDropdown(null);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  function goTo(id) {
    setOpenDropdown(null);
    navigate(id === "overview" ? config.basePath : `${config.basePath}/${id}`);
  }

  function handleLogout() {
    localStorage.clear();
    navigate("/login");
  }

  const accentColor = ROLE_COLORS[portal] || "var(--accent)";

  return (
    <div className={`ps-landing ${themeClass}`} style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      {/* TOP NAVBAR */}
      <nav className="dash-nav" ref={navRef}>
        <div className="dash-nav-inner">
          {/* Logo */}
          <a href={config.basePath} className="dash-nav-logo" onClick={(e) => { e.preventDefault(); navigate(config.basePath); }}>
            <span className="nav-logo-mark">P</span>
            <span>ParkSmart</span>
          </a>

          {/* Menu items with dropdowns */}
          <div className="dash-nav-menu">
            {config.menuGroups.map((group, gi) => {
              if (group.items.length === 1) {
                const item = group.items[0];
                const isActive = pageKey === item.id;
                return (
                  <button key={gi} className={`dash-nav-item ${isActive ? "active" : ""}`} onClick={() => goTo(item.id)}>
                    {item.label}
                  </button>
                );
              }
              const isOpen = openDropdown === gi;
              const hasActive = group.items.some((it) => pageKey === it.id);
              return (
                <button key={gi} className={`dash-nav-item ${isOpen ? "open" : ""} ${hasActive ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); setOpenDropdown(isOpen ? null : gi); setUserMenuOpen(false); }}>
                  {group.label}
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                  <div className="dash-dropdown">
                    {group.items.map((item) => (
                      <a key={item.id} href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(item.id); }}
                        style={pageKey === item.id ? { color: "var(--accent)", fontWeight: 600 } : {}}>
                        {item.label}
                        {item.id === "notifications" && unreadCount > 0 && (
                          <span style={{ marginLeft: "auto", background: "var(--danger)", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 100 }}>
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: notification + user */}
          <div className="dash-nav-right">
            <button className="theme-toggle-btn" onClick={toggle} title={dark ? "Light mode" : "Dark mode"}>
              {dark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
            </button>
            <button className="dash-notif-btn" onClick={() => goTo("notifications")} title="Thông báo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              {unreadCount > 0 && <span className="dash-notif-dot" />}
            </button>

            <div className="dash-user" style={{ position: "relative" }}
              onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); setOpenDropdown(null); }}>
              <div className="dash-user-avatar" style={{ background: accentColor }}>{initialsFromName(username)}</div>
              <div>
                <span className="dash-user-name">{username}</span>
                <span className="dash-user-role">{config.label}</span>
              </div>
              {userMenuOpen && (
                <div className="dash-dropdown" style={{ opacity: 1, visibility: "visible", transform: "translateY(0)", top: "calc(100% + 8px)", right: 0, left: "auto" }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); goTo("profile"); }} style={portal !== "driver" ? { display: "none" } : {}}>Hồ sơ</a>
                  <a href="#" onClick={(e) => { e.preventDefault(); goTo("settings"); }}>Cài đặt</a>
                  <div className="dash-dropdown-divider" />
                  <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} style={{ color: "var(--danger)" }}>Đăng xuất</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  );
}
