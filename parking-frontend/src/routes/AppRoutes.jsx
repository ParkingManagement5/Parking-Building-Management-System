import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

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
import ParkingSessionPage from "../pages/staff/ParkingSessionPage";
import VehicleExitPage from "../pages/staff/VehicleExitPage";
import FeeCalculationPage from "../pages/staff/FeeCalculationPage";
import PaymentProcessingPage from "../pages/staff/PaymentProcessingPage";
import RequestProcessingPage from "../pages/staff/RequestProcessingPage";
import ExceptionCasePage from "../pages/staff/ExceptionCasePage";
import StaffNotificationPage from "../pages/staff/StaffNotificationPage";

import DriverDashboard from "../pages/driver/DriverDashboard";
import DriverProfilePage from "../pages/driver/DriverProfilePage";
import MyVehiclesPage from "../pages/driver/MyVehiclesPage";
import DriverParkingSlotPage from "../pages/driver/DriverParkingSlotPage";
import BookingPage from "../pages/driver/BookingPage";
import BookingHistoryPage from "../pages/driver/BookingHistoryPage";
import CurrentSessionPage from "../pages/driver/CurrentSessionPage";
import PaymentHistoryPage from "../pages/driver/PaymentHistoryPage";
import RequestCenterPage from "../pages/driver/RequestCenterPage";
import DriverNotificationPage from "../pages/driver/DriverNotificationPage";

import HomePage from "../pages/public/HomePage";
import ParkingInfoPage from "../pages/public/ParkingInfoPage";
import PublicSlotListPage from "../pages/public/PublicSlotListPage";
import RegisterPage from "../pages/auth/RegisterPage";
export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/parking-info" element={<ParkingInfoPage />} />
          <Route path="/public-slots" element={<PublicSlotListPage />} />
        
        </Route>

        <Route path="/login" element={<LoginPage />} />
<Route path="/register" element={<RegisterPage />} />
<Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        <Route element={<ProtectedRoute allowedRoles={["MANAGER", "ADMIN"]} />}>
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
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/admin" element={<DashboardLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="roles" element={<RoleManagementPage />} />
            <Route path="system-config" element={<SystemConfigPage />} />
            <Route path="activity-logs" element={<ActivityLogPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["STAFF", "MANAGER", "ADMIN"]} />}>
          <Route path="/staff" element={<DashboardLayout />}>
            <Route index element={<StaffDashboard />} />
            <Route path="vehicle-entry" element={<VehicleEntryPage />} />
            <Route path="qr-verification" element={<QrVerificationPage />} />
            <Route path="ocr-scan" element={<OcrScanPage />} />
            <Route path="ocr-correction" element={<OcrCorrectionPage />} />
            <Route path="parking-sessions" element={<ParkingSessionPage />} />
            <Route path="vehicle-exit" element={<VehicleExitPage />} />
            <Route path="fee-calculation" element={<FeeCalculationPage />} />
            <Route path="payment-processing" element={<PaymentProcessingPage />} />
            <Route path="requests" element={<RequestProcessingPage />} />
            <Route path="exceptions" element={<ExceptionCasePage />} />
            <Route path="notifications" element={<StaffNotificationPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["DRIVER"]} />}>
          <Route path="/driver" element={<DashboardLayout />}>
            <Route index element={<DriverDashboard />} />
            <Route path="profile" element={<DriverProfilePage />} />
            <Route path="vehicles" element={<MyVehiclesPage />} />
            <Route path="parking-slots" element={<DriverParkingSlotPage />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="booking-history" element={<BookingHistoryPage />} />
            <Route path="current-session" element={<CurrentSessionPage />} />
            <Route path="payment-history" element={<PaymentHistoryPage />} />
            <Route path="requests" element={<RequestCenterPage />} />
            <Route path="notifications" element={<DriverNotificationPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}