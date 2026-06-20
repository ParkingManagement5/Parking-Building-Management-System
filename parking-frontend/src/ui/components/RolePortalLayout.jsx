import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  BookOpen,
  Car,
  CreditCard,
  DoorOpen,
  Grid3x3,
  LayoutDashboard,
  Layers,
  LogIn,
  LogOut,
  MessageSquare,
  Map,
  QrCode,
  ScanLine,
  Settings,
  Shield,
  SquareParking,
  Clock,
  User,
  Users,
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import { notificationApi } from "../../api/notificationApi";
import { getRole, getUserId, getUsername } from "../../utils/auth";
import { unwrapApiData } from "../../utils/api";

const CONFIG = {
  driver: {
    basePath: "/driver",
    role: "driver",
    navItems: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "vehicles", label: "My Vehicles", icon: Car },
      { id: "parking-slots", label: "Parking Slots", icon: SquareParking },
      { id: "booking", label: "Book a Slot", icon: BookOpen },
      { id: "current-session", label: "Current Session", icon: Clock },
      { id: "parking-map", label: "Parking Map", icon: Map },
      { id: "payments", label: "Payment History", icon: CreditCard },
      { id: "requests", label: "Request Center", icon: MessageSquare },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "profile", label: "My Profile", icon: User },
    ],
    titles: {
      overview: {
        title: "Driver Dashboard",
        subtitle: "Track your vehicles, parking activity and alerts in one place",
      },
      vehicles: {
        title: "My Vehicles",
        subtitle: "Manage your registered vehicles and linked parking details",
      },
      "parking-slots": {
        title: "Available Parking Slots",
        subtitle: "Browse live slot availability across buildings and zones",
      },
      booking: {
        title: "Book a Parking Slot",
        subtitle: "Create a new booking from your vehicles and available slots",
      },
      "current-session": {
        title: "Current Session",
        subtitle: "Check your active parking session and real-time details",
      },
      "parking-map": {
        title: "Parking Map",
        subtitle: "Visual route from entry gate to your booked slot",
      },
      payments: {
        title: "Payment History",
        subtitle: "Review your completed parking payments from the backend",
      },
      requests: {
        title: "Request Center",
        subtitle: "Send support requests and track their latest status",
      },
      notifications: {
        title: "Notifications",
        subtitle: "Stay updated with your latest parking alerts and messages",
      },
      profile: {
        title: "My Profile",
        subtitle: "View your account details for the driver portal",
      },
      settings: {
        title: "Settings",
        subtitle: "Adjust portal preferences and account actions",
      },
    },
  },
  staff: {
    basePath: "/staff",
    role: "staff",
    navItems: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "entry", label: "Vehicle Entry", icon: LogIn },
      { id: "exit", label: "Vehicle Exit", icon: LogOut },
      { id: "qr", label: "QR Verification", icon: QrCode },
      { id: "ocr", label: "OCR Scanner", icon: ScanLine },
      { id: "ocr-correction", label: "OCR Correction", icon: ScanLine },
      { id: "sessions", label: "Parking Sessions", icon: Clock },
      { id: "payments", label: "Payment Processing", icon: CreditCard },
      { id: "requests", label: "Request Processing", icon: MessageSquare },
      { id: "exceptions", label: "Exception Cases", icon: AlertTriangle },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
    titles: {
      overview: {
        title: "Staff Dashboard",
        subtitle: "Monitor daily processing, queue status and incoming alerts",
      },
      entry: {
        title: "Vehicle Entry",
        subtitle: "",
      },
      exit: {
        title: "Vehicle Exit",
        subtitle: "",
      },
      qr: {
        title: "QR Verification",
        subtitle: "",
      },
      ocr: {
        title: "OCR Scanner",
        subtitle: "",
      },
      "ocr-correction": {
        title: "OCR Correction",
        subtitle: "",
      },
      sessions: {
        title: "Parking Sessions",
        subtitle: "",
      },
      payments: {
        title: "Payment Processing",
        subtitle: "",
      },
      requests: {
        title: "Request Processing",
        subtitle: "",
      },
      exceptions: {
        title: "Exception Cases",
        subtitle: "",
      },
      notifications: {
        title: "Notifications",
        subtitle: "",
      },
      settings: {
        title: "Settings",
        subtitle: "",
      },
    },
  },
  manager: {
    basePath: "/manager",
    role: "manager",
    navItems: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "buildings", label: "Buildings", icon: Building2 },
      { id: "floors", label: "Floors", icon: Layers },
      { id: "zones", label: "Zones", icon: Grid3x3 },
      { id: "parking-slots", label: "Parking Slots", icon: SquareParking },
      { id: "gates", label: "Gates", icon: DoorOpen },
      { id: "vehicle-types", label: "Vehicle Types", icon: Car },
      { id: "pricing-policies", label: "Pricing Policy", icon: CreditCard },
      { id: "staff-shifts", label: "Staff Shifts", icon: Users },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
    titles: {
      overview: {
        title: "Manager Dashboard",
        subtitle: "A complete view of operations, inventory and performance",
      },
      buildings: {
        title: "Building Management",
        subtitle: "Configure parking buildings, access details and operating hours",
      },
      floors: {
        title: "Floor Management",
        subtitle: "Organize each building floor for accurate capacity planning",
      },
      zones: {
        title: "Zone Management",
        subtitle: "Set up vehicle zones by floor and parking rules",
      },
      "parking-slots": {
        title: "Parking Slot Management",
        subtitle: "Manage slot inventory, status and zone allocation",
      },
      gates: {
        title: "Gate Management",
        subtitle: "Control entry and exit points for each parking building",
      },
      "vehicle-types": {
        title: "Vehicle Type Management",
        subtitle: "Define supported vehicle categories, sizes and rates",
      },
      "pricing-policies": {
        title: "Pricing Policies",
        subtitle: "Set flexible parking rates by time, day and vehicle type",
      },
      "staff-shifts": {
        title: "Staff Shifts",
        subtitle: "Plan staff assignments and shift coverage across operations",
      },
      notifications: {
        title: "Notifications",
        subtitle: "Keep up with operational notices, events and escalations",
      },
      settings: {
        title: "Settings",
        subtitle: "Adjust portal preferences and account actions",
      },
    },
  },
  admin: {
    basePath: "/admin",
    role: "admin",
    navItems: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "users", label: "Users", icon: Users },
      { id: "roles", label: "Roles", icon: Shield },
      { id: "system-config", label: "System Config", icon: Settings },
    ],
    titles: {
      overview: {
        title: "Admin Dashboard",
        subtitle: "See users, roles and system health at a glance",
      },
      users: {
        title: "User Management",
        subtitle: "Review accounts, roles and access status across the platform",
      },
      roles: {
        title: "Role Management",
        subtitle: "Inspect role definitions and platform access structure",
      },
      "system-config": {
        title: "System Configuration",
        subtitle: "Control global settings that power the parking platform",
      },
      settings: {
        title: "Settings",
        subtitle: "Adjust portal preferences and account actions",
      },
    },
  },
};

function initialsFromName(name) {
  const parts = String(name || "User").trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";
}

export default function RolePortalLayout({ portal }) {
  const navigate = useNavigate();
  const location = useLocation();
  const config = CONFIG[portal];
  const username = getUsername() || "User";
  const role = getRole() || portal.toUpperCase();
  const userId = getUserId();
  const [notifications, setNotifications] = useState([]);
  const currentPage =
    location.pathname.replace(`${config.basePath}/`, "").replace(config.basePath, "") ||
    "overview";
  const pageKey = currentPage === "/" || currentPage === "" ? "overview" : currentPage;
  const titleMeta = config.titles[pageKey] || config.titles.overview;
  const notificationItems = useMemo(
    () =>
      notifications
        .slice()
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 8),
    [notifications]
  );
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const navItems = useMemo(
    () =>
      config.navItems.map((item) =>
        item.id === "notifications"
          ? { ...item, badge: unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount) : undefined }
          : item
      ),
    [config.navItems, unreadCount]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      if (!userId || !config.navItems.some((item) => item.id === "notifications")) {
        if (!cancelled) {
          setNotifications([]);
        }
        return;
      }

      try {
        const res = await notificationApi.getByUser(userId);
        if (!cancelled) {
          setNotifications(unwrapApiData(res.data, []));
        }
      } catch (error) {
        console.error("Failed to load portal notifications", error);
        if (!cancelled) {
          setNotifications([]);
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [config.navItems, userId, location.pathname]);

  const handleMarkNotificationRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      if (!userId) {
        return;
      }
      const res = await notificationApi.getByUser(userId);
      setNotifications(unwrapApiData(res.data, []));
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!userId) {
      return;
    }
    try {
      await notificationApi.markAllAsRead(userId);
      const res = await notificationApi.getByUser(userId);
      setNotifications(unwrapApiData(res.data, []));
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };

  return (
    <DashboardLayout
      role={config.role}
      navItems={navItems}
      currentPage={pageKey}
      setCurrentPage={(page) =>
        navigate(page === "overview" ? config.basePath : `${config.basePath}/${page}`)
      }
      title={titleMeta.title}
      subtitle={titleMeta.subtitle}
      userName={username}
      userInitials={initialsFromName(username)}
      userEmail={`${role.toLowerCase()} portal`}
      notificationCount={unreadCount}
      notificationItems={notificationItems}
      onMarkNotificationRead={handleMarkNotificationRead}
      onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      notificationPath={`${config.basePath}/notifications`}
      settingsPath={`${config.basePath}/settings`}
    >
      <div className="portal-screen">
        <Outlet />
      </div>
    </DashboardLayout>
  );
}
