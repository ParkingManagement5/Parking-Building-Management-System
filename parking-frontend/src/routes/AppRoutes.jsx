import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import PublicLayout from "../layouts/PublicLayout";
import LandingPage from "../ui/components/LandingPage";
import ParkingInfoPage from "../pages/public/ParkingInfoPage";
import PublicSlotListPage from "../pages/public/PublicSlotListPage";
import LoginPage from "../ui/components/LoginPage";
import RegisterPage from "../ui/components/RegisterPage";
import UnauthorizedPage from "../pages/auth/UnauthorizedPage";
import RolePortalLayout from "../ui/components/RolePortalLayout";
import DriverDashboard from "../pages/driver/DriverDashboard";
import DriverNotificationPage from "../pages/driver/DriverNotificationPage";
import DriverParkingSlotPage from "../pages/driver/DriverParkingSlotPage";
import MyVehiclesPage from "../pages/driver/MyVehiclesPage";
import BookingPage from "../pages/driver/BookingPage";
import CurrentSessionPage from "../pages/driver/CurrentSessionPage";
import PaymentHistoryPage from "../pages/driver/PaymentHistoryPage";
import RequestCenterPage from "../pages/driver/RequestCenterPage";
import DriverProfilePage from "../pages/driver/DriverProfilePage";
import StaffDashboard from "../pages/staff/StaffDashboard";
import StaffNotificationPage from "../pages/staff/StaffNotificationPage";
import VehicleEntryPage from "../pages/staff/VehicleEntryPage";
import VehicleExitPage from "../pages/staff/VehicleExitPage";
import QrVerificationPage from "../pages/staff/QrVerificationPage";
import OcrScanPage from "../pages/staff/OcrScanPage";
import OcrCorrectionPage from "../pages/staff/OcrCorrectionPage";
import ParkingSessionPage from "../pages/staff/ParkingSessionPage";
import PaymentProcessingPage from "../pages/staff/PaymentProcessingPage";
import RequestProcessingPage from "../pages/staff/RequestProcessingPage";
import ExceptionCasePage from "../pages/staff/ExceptionCasePage";
import ManagerDashboard from "../pages/manager/ManagerDashboard";
import ManagerNotificationPage from "../pages/manager/ManagerNotificationPage";
import BuildingPage from "../pages/parking/BuildingPage";
import FloorPage from "../pages/parking/FloorPage";
import ZonePage from "../pages/parking/ZonePage";
import ParkingSlotPage from "../pages/parking/ParkingSlotPage";
import GatePage from "../pages/parking/GatePage";
import VehicleTypePage from "../pages/parking/VehicleTypePage";
import PricingPolicyPage from "../pages/manager/PricingPolicyPage";
import StaffShiftPage from "../pages/manager/StaffShiftPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import UserManagementPage from "../pages/user/UserManagementPage";
import RoleManagementPage from "../pages/admin/RoleManagementPage";
import SystemConfigPage from "../pages/admin/SystemConfigPage";
import PortalSettingsPage from "../pages/user/PortalSettingsPage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<PublicLayout />}>
          <Route path="/parking-info" element={<ParkingInfoPage />} />
          <Route path="/public-slots" element={<PublicSlotListPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route element={<ProtectedRoute allowedRoles={["DRIVER"]} />}>
          <Route path="/driver" element={<RolePortalLayout portal="driver" />}>
            <Route index element={<DriverDashboard />} />
            <Route path="vehicles" element={<MyVehiclesPage />} />
            <Route path="parking-slots" element={<DriverParkingSlotPage />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="current-session" element={<CurrentSessionPage />} />
            <Route path="payments" element={<PaymentHistoryPage />} />
            <Route path="requests" element={<RequestCenterPage />} />
            <Route path="notifications" element={<DriverNotificationPage />} />
            <Route path="profile" element={<DriverProfilePage />} />
            <Route path="settings" element={<PortalSettingsPage portal="driver" />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["STAFF", "MANAGER", "ADMIN"]} />}>
          <Route path="/staff" element={<RolePortalLayout portal="staff" />}>
            <Route index element={<StaffDashboard />} />
            <Route path="entry" element={<VehicleEntryPage />} />
            <Route path="exit" element={<VehicleExitPage />} />
            <Route path="qr" element={<QrVerificationPage />} />
            <Route path="ocr" element={<OcrScanPage />} />
            <Route path="ocr-correction" element={<OcrCorrectionPage />} />
            <Route path="sessions" element={<ParkingSessionPage />} />
            <Route path="payments" element={<PaymentProcessingPage />} />
            <Route path="requests" element={<RequestProcessingPage />} />
            <Route path="exceptions" element={<ExceptionCasePage />} />
            <Route path="notifications" element={<StaffNotificationPage />} />
            <Route path="settings" element={<PortalSettingsPage portal="staff" />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["MANAGER", "ADMIN"]} />}>
          <Route path="/manager" element={<RolePortalLayout portal="manager" />}>
            <Route index element={<ManagerDashboard />} />
            <Route path="buildings" element={<BuildingPage />} />
            <Route path="floors" element={<FloorPage />} />
            <Route path="zones" element={<ZonePage />} />
            <Route path="parking-slots" element={<ParkingSlotPage />} />
            <Route path="gates" element={<GatePage />} />
            <Route path="vehicle-types" element={<VehicleTypePage />} />
            <Route path="pricing-policies" element={<PricingPolicyPage />} />
            <Route path="staff-shifts" element={<StaffShiftPage />} />
            <Route path="notifications" element={<ManagerNotificationPage />} />
            <Route path="settings" element={<PortalSettingsPage portal="manager" />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/admin" element={<RolePortalLayout portal="admin" />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="roles" element={<RoleManagementPage />} />
            <Route path="system-config" element={<SystemConfigPage />} />
            <Route path="settings" element={<PortalSettingsPage portal="admin" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
