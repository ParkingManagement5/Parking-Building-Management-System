import { BrowserRouter, Routes, Route } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import DashboardLayout from "../layouts/DashboardLayout";

import LoginPage from "../pages/auth/LoginPage";
import UnauthorizedPage from "../pages/auth/UnauthorizedPage";

import DashboardPage from "../pages/dashboard/DashboardPage";

import VehicleTypePage from "../pages/parking/VehicleTypePage";
import BuildingPage from "../pages/parking/BuildingPage";
import FloorPage from "../pages/parking/FloorPage";
import ZonePage from "../pages/parking/ZonePage";
import ParkingSlotPage from "../pages/parking/ParkingSlotPage";
import GatePage from "../pages/parking/GatePage";

import UserManagementPage from "../pages/user/UserManagementPage";
import ProfilePage from "../pages/user/ProfilePage";

import PricingPolicyPage from "../pages/manager/PricingPolicyPage";
import StaffShiftPage from "../pages/manager/StaffShiftPage";
import ReportsPage from "../pages/manager/ReportsPage";
import ManagerNotificationPage from "../pages/manager/ManagerNotificationPage";

import AdminDashboard from "../pages/admin/AdminDashboard";
import RoleManagementPage from "../pages/admin/RoleManagementPage";
import SystemConfigPage from "../pages/admin/SystemConfigPage";
import ActivityLogPage from "../pages/admin/ActivityLogPage";
import AdminReportsPage from "../pages/admin/AdminReportsPage";

import StaffDashboard from "../pages/staff/StaffDashboard";
import VehicleEntryPage from "../pages/staff/VehicleEntryPage";
import QrVerificationPage from "../pages/staff/QrVerificationPage";
import OcrScanPage from "../pages/staff/OcrScanPage";
import OcrCorrectionPage from "../pages/staff/OcrCorrectionPage";
export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route
            path="/"
            element={<div className="public-section">Home Page</div>}
          />
          <Route
            path="/parking-info"
            element={<div className="public-section">Parking Information</div>}
          />
          <Route
            path="/public-slots"
            element={<div className="public-section">Public Parking Slots</div>}
          />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route path="/manager" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="buildings" element={<BuildingPage />} />
          <Route path="floors" element={<FloorPage />} />
          <Route path="zones" element={<ZonePage />} />
          <Route path="parking-slots" element={<ParkingSlotPage />} />
          <Route path="gates" element={<GatePage />} />
          <Route path="vehicle-types" element={<VehicleTypePage />} />
          <Route path="pricing-policies" element={<PricingPolicyPage />} />
          <Route path="staff-shifts" element={<StaffShiftPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="notifications" element={<ManagerNotificationPage />} />
        </Route>

        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="roles" element={<RoleManagementPage />} />
          <Route path="system-config" element={<SystemConfigPage />} />
          <Route path="activity-logs" element={<ActivityLogPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
        </Route>

        <Route path="/staff" element={<DashboardLayout />}>
  <Route index element={<StaffDashboard />} />
  <Route path="vehicle-entry" element={<VehicleEntryPage />} />
  <Route path="qr-verification" element={<QrVerificationPage />} />
  <Route path="ocr-scan" element={<OcrScanPage />} />
  <Route path="ocr-correction" element={<OcrCorrectionPage />} />
</Route>

        <Route path="/driver" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}