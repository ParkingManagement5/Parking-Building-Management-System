import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
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
      { label: "Tổng quan", items: [{ id: "overview", label: "Trang chủ" }] },
      {
        label: "Đỗ xe",
        items: [
          { id: "booking", label: "Đặt chỗ" },
          { id: "current-session", label: "Phiên hiện tại" },
          { id: "parking-map", label: "Bản đồ bãi" },
          { id: "find-building", label: "Tìm bãi đỗ" },
        ],
      },
      {
        label: "Hồ sơ",
        items: [
          { id: "bookings", label: "Lịch sử đặt" },
          { id: "payments", label: "Thanh toán" },
          { id: "vehicles", label: "Xe của tôi" },
        ],
      },
      {
        label: "Tài khoản",
        items: [
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
      { label: "Tổng quan", items: [{ id: "overview", label: "Trang chủ" }] },
      {
        label: "Vận hành",
        items: [
          { id: "scan", label: "Scan" },
          { id: "gate", label: "Bản đồ bãi" },
          { id: "sessions", label: "Sessions" },
          { id: "payments", label: "Thanh toán" },
        ],
      },
      {
        label: "Xử lý",
        items: [
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
      { label: "Tổng quan", items: [{ id: "overview", label: "Trang chủ" }] },
      {
        label: "Cơ sở hạ tầng",
        items: [
          { id: "parking-structure", label: "Cấu trúc bãi xe" },
        ],
      },
      {
        label: "Báo cáo",
        items: [
          { id: "reports", label: "Doanh thu & Lượt xe" },
        ],
      },
      {
        label: "Cấu hình",
        items: [
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
      { label: "Tổng quan", items: [{ id: "overview", label: "Trang chủ" }] },
      {
        label: "Hệ thống",
        items: [
          { id: "users", label: "Người dùng" },
          { id: "roles", label: "Vai trò" },
          { id: "system-config", label: "Cấu hình" },
          { id: "activity-logs", label: "Nhật ký hoạt động" },
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

const DRIVER_MOBILE_NAV_ITEMS = [
  { id: "overview", label: "Trang chủ" },
  { id: "booking", label: "Đặt chỗ" },
  { id: "current-session", label: "Phiên xe" },
  { id: "parking-map", label: "Bản đồ" },
  { id: "profile", label: "Tôi" },
];

function initialsFromName(name) {
  const parts = String(name || "U").trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "U";
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
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef(null);

  const currentPage = location.pathname.replace(`${config.basePath}/`, "").replace(config.basePath, "") || "overview";
  const pageKey = currentPage === "/" || currentPage === "" ? "overview" : currentPage;
  const flatMenuItems = useMemo(() => config.menuGroups.flatMap((group) => group.items), [config.menuGroups]);
  const mobileTitle = flatMenuItems.find((item) => item.id === pageKey)?.label || "Trang chủ";
  const isDriverPortal = portal === "driver";
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const todayNotifications = useMemo(() => {
    const todayKey = new Date().toDateString();
    return notifications
      .filter((notification) => notification.createdAt && new Date(notification.createdAt).toDateString() === todayKey)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notifications]);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      if (!userId) return;

      try {
        const response = await notificationApi.getByUser(userId);
        if (!cancelled) {
          setNotifications(unwrapApiData(response.data, []));
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
        }
      }
    }

    loadNotifications();
    const intervalId = setInterval(loadNotifications, 15000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [userId, location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!navRef.current?.contains(event.target)) {
        setOpenDropdown(null);
        setUserMenuOpen(false);
        setNotifOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  useEffect(() => {
    setOpenDropdown(null);
    setUserMenuOpen(false);
    setNotifOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  function goTo(id) {
    setOpenDropdown(null);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    navigate(id === "overview" ? config.basePath : `${config.basePath}/${id}`);
  }

  function handleLogout() {
    localStorage.clear();
    navigate("/login");
  }

  function handleNotifItemClick(notification) {
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((item) => (item.notificationId === notification.notificationId ? { ...item, isRead: true } : item))
      );
      notificationApi.markAsRead(notification.notificationId).catch(() => {});
    }
  }

  const accentColor = ROLE_COLORS[portal] || "var(--accent)";

  return (
    <div className={`ps-landing ${themeClass}`} style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      <nav className="dash-nav" ref={navRef}>
        <div className="dash-nav-inner">
          <a
            href={config.basePath}
            className="dash-nav-logo"
            onClick={(event) => {
              event.preventDefault();
              navigate(config.basePath);
            }}
          >
            <span className="nav-logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </span>
            <span>ParkSmart</span>
          </a>

          <div className="dash-mobile-page-title">
            <span>{mobileTitle}</span>
          </div>

          <div className="dash-nav-menu">
            {config.menuGroups
              .filter((group) => !(group.items.length === 1 && group.items[0].id === "overview"))
              .map((group, index) => {
                const isOpen = openDropdown === index;
                const hasActive = group.items.some((item) => pageKey === item.id);

                return (
                  <button
                    key={group.label}
                    type="button"
                    className={`dash-nav-item ${isOpen ? "open" : ""} ${hasActive ? "active" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenDropdown(isOpen ? null : index);
                      setUserMenuOpen(false);
                      setNotifOpen(false);
                      setMobileMenuOpen(false);
                    }}
                  >
                    {group.label}
                    <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                    <div className="dash-dropdown">
                      {group.items.map((item) => (
                        <a
                          key={item.id}
                          href="/"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            goTo(item.id);
                          }}
                          style={pageKey === item.id ? { color: "var(--accent)", fontWeight: 600 } : {}}
                        >
                          {item.label}
                          {item.id === "notifications" && unreadCount > 0 && (
                            <span
                              style={{
                                marginLeft: "auto",
                                background: "var(--danger)",
                                color: "#fff",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 100,
                              }}
                            >
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

          <div className="dash-nav-right">
            <button className="theme-toggle-btn" onClick={toggle} title={dark ? "Light mode" : "Dark mode"}>
              {dark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>

            <div style={{ position: "relative" }}>
              <button
                className="dash-notif-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  setNotifOpen((prev) => !prev);
                  setOpenDropdown(null);
                  setUserMenuOpen(false);
                  setMobileMenuOpen(false);
                }}
                title="Thông báo hôm nay"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                {unreadCount > 0 && <span className="dash-notif-dot" />}
              </button>

              {notifOpen && (
                <div
                  className="dash-dropdown"
                  style={{
                    opacity: 1,
                    visibility: "visible",
                    transform: "translateY(0)",
                    top: "calc(100% + 8px)",
                    right: 0,
                    left: "auto",
                    width: 340,
                    maxWidth: "calc(100vw - 32px)",
                    padding: 0,
                  }}
                >
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
                    <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "var(--text)" }}>Thông báo hôm nay</p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {todayNotifications.length === 0 ? "Chưa có thông báo nào" : `${todayNotifications.length} thông báo`}
                    </p>
                  </div>

                  <div style={{ maxHeight: 340, overflowY: "auto" }}>
                    {todayNotifications.length === 0 ? (
                      <p style={{ margin: 0, padding: "24px 14px", textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        Không có thông báo nào phát sinh hôm nay.
                      </p>
                    ) : (
                      todayNotifications.slice(0, 8).map((notification) => (
                        <a
                          key={notification.notificationId}
                          href="/"
                          onClick={(event) => {
                            event.preventDefault();
                            handleNotifItemClick(notification);
                          }}
                          style={{
                            display: "block",
                            padding: "10px 14px",
                            borderBottom: "1px solid var(--border)",
                            background: notification.isRead ? "transparent" : "rgba(16,185,129,0.06)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {!notification.isRead && (
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
                            )}
                            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>{notification.title}</span>
                          </div>
                          {notification.body && (
                            <p
                              style={{
                                margin: "4px 0 0",
                                fontSize: "0.78rem",
                                color: "var(--text-secondary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {notification.body}
                            </p>
                          )}
                          <p style={{ margin: "4px 0 0", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            {new Date(notification.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </a>
                      ))
                    )}
                  </div>

                  <a
                    href="/"
                    onClick={(event) => {
                      event.preventDefault();
                      goTo("notifications");
                    }}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "10px 14px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--accent)",
                    }}
                  >
                    Xem tất cả thông báo
                  </a>
                </div>
              )}
            </div>

            <button
              type="button"
              className={`dash-mobile-toggle ${mobileMenuOpen ? "open" : ""}`}
              aria-label="Mở menu điều hướng"
              aria-expanded={mobileMenuOpen}
              onClick={(event) => {
                event.stopPropagation();
                setMobileMenuOpen((prev) => !prev);
                setOpenDropdown(null);
                setUserMenuOpen(false);
                setNotifOpen(false);
              }}
            >
              <span />
              <span />
              <span />
            </button>

            <div
              className="dash-user"
              style={{ position: "relative" }}
              onClick={(event) => {
                event.stopPropagation();
                setUserMenuOpen(!userMenuOpen);
                setOpenDropdown(null);
                setNotifOpen(false);
                setMobileMenuOpen(false);
              }}
            >
              <div className="dash-user-avatar" style={{ background: accentColor }}>
                {initialsFromName(username)}
              </div>
              <div>
                <span className="dash-user-name">{username}</span>
                <span className="dash-user-role">{config.label}</span>
              </div>
              {userMenuOpen && (
                <div
                  className="dash-dropdown"
                  style={{
                    opacity: 1,
                    visibility: "visible",
                    transform: "translateY(0)",
                    top: "calc(100% + 8px)",
                    right: 0,
                    left: "auto",
                  }}
                >
                  {portal === "driver" && (
                    <a
                      href="/"
                      onClick={(event) => {
                        event.preventDefault();
                        goTo("profile");
                      }}
                    >
                      Hồ sơ
                    </a>
                  )}
                  <a
                    href="/"
                    onClick={(event) => {
                      event.preventDefault();
                      goTo("settings");
                    }}
                  >
                    Cài đặt
                  </a>
                  <div className="dash-dropdown-divider" />
                  <a
                    href="/"
                    onClick={(event) => {
                      event.preventDefault();
                      handleLogout();
                    }}
                    style={{ color: "var(--danger)" }}
                  >
                    Đăng xuất
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`dash-mobile-panel ${mobileMenuOpen ? "open" : ""}`}>
          <div className="dash-mobile-panel-body">
            {config.menuGroups.map((group) => (
              <div key={group.label} className="dash-mobile-group">
                <p className="dash-mobile-group-label">{group.label}</p>
                <div className="dash-mobile-links">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`dash-mobile-link ${pageKey === item.id ? "active" : ""}`}
                      onClick={() => goTo(item.id)}
                    >
                      <span>{item.label}</span>
                      {item.id === "notifications" && unreadCount > 0 && (
                        <strong>{unreadCount > 9 ? "9+" : unreadCount}</strong>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="dash-mobile-account">
              <div className="dash-mobile-user-card">
                <div className="dash-user-avatar" style={{ background: accentColor }}>
                  {initialsFromName(username)}
                </div>
                <div>
                  <p>{username}</p>
                  <span>{role}</span>
                </div>
              </div>
              <button type="button" className="dash-mobile-secondary" onClick={() => goTo("settings")}>
                Cài đặt
              </button>
              <button type="button" className="dash-mobile-danger" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className={`dashboard-content ${isDriverPortal ? "dashboard-content-has-mobile-nav" : ""}`}>
        <Outlet />
      </div>

      {isDriverPortal && (
        <div className="dash-mobile-bottom-nav">
          {DRIVER_MOBILE_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`dash-mobile-bottom-item ${pageKey === item.id ? "active" : ""}`}
              onClick={() => goTo(item.id)}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
