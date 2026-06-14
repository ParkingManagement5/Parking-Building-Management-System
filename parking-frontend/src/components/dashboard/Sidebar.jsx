import {
  LayoutDashboard,
  Building2,
  Layers3,
  Map,
  SquareParking,
  DoorOpen,
  Car,
  CreditCard,
  Users,
  Bell,
  Shield,
  Settings,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  let currentRole = "MANAGER";

  if (location.pathname.startsWith("/admin")) {
    currentRole = "ADMIN";
  } else if (location.pathname.startsWith("/staff")) {
    currentRole = "STAFF";
  } else if (location.pathname.startsWith("/driver")) {
    currentRole = "DRIVER";
  }

  const managerMenus = [
    { label: "Dashboard", path: "/manager", icon: <LayoutDashboard size={20} /> },
    { label: "Building Management", path: "/manager/buildings", icon: <Building2 size={20} /> },
    { label: "Floor Management", path: "/manager/floors", icon: <Layers3 size={20} /> },
    { label: "Zone Management", path: "/manager/zones", icon: <Map size={20} /> },
    { label: "Parking Slot Management", path: "/manager/parking-slots", icon: <SquareParking size={20} /> },
    { label: "Gate Management", path: "/manager/gates", icon: <DoorOpen size={20} /> },
    { label: "Vehicle Type Management", path: "/manager/vehicle-types", icon: <Car size={20} /> },
    { label: "Pricing Policy Management", path: "/manager/pricing-policies", icon: <CreditCard size={20} /> },
    { label: "Staff Shift Management", path: "/manager/staff-shifts", icon: <Users size={20} /> },
    { label: "Notification Center", path: "/manager/notifications", icon: <Bell size={20} /> },
  ];

  const adminMenus = [
    { label: "Dashboard", path: "/admin", icon: <LayoutDashboard size={20} /> },
    { label: "User Management", path: "/admin/users", icon: <Users size={20} /> },
    { label: "Role Management", path: "/admin/roles", icon: <Shield size={20} /> },
    { label: "System Configuration", path: "/admin/system-config", icon: <Settings size={20} /> },
  ];

  const staffMenus = [
    { label: "Dashboard", path: "/staff", icon: <LayoutDashboard size={20} /> },
    { label: "Notifications", path: "/staff/notifications", icon: <Bell size={20} /> },
  ];

  const driverMenus = [
    { label: "Dashboard", path: "/driver", icon: <LayoutDashboard size={20} /> },
    { label: "My Vehicles", path: "/driver/vehicles", icon: <Car size={20} /> },
    { label: "Parking Slots", path: "/driver/parking-slots", icon: <SquareParking size={20} /> },
    { label: "Notifications", path: "/driver/notifications", icon: <Bell size={20} /> },
  ];

  const menusByRole = {
    ADMIN: adminMenus,
    MANAGER: managerMenus,
    STAFF: staffMenus,
    DRIVER: driverMenus,
  };

  const roleTitle = {
    ADMIN: "System Administrator",
    MANAGER: "Parking Manager",
    STAFF: "Parking Staff",
    DRIVER: "Driver / Parking User",
  };

  const menus = menusByRole[currentRole];

  return (
    <aside className="sidebar">
      <div className="logo-box">
        <h2>Parking System</h2>
        <p>{roleTitle[currentRole]}</p>
      </div>

      <nav className="sidebar-menu">
        {menus.map((item) => (
          <NavLink key={item.path} to={item.path} className="nav-item">
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
