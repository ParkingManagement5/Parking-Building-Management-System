import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import PublicLayout from "../layouts/PublicLayout";
import LandingPage from "../ui/components/LandingPage";
import PublicSlotListPage from "../pages/public/PublicSlotListPage";
import LoginPage from "../ui/components/LoginPage";
import RegisterPage from "../ui/components/RegisterPage";
import VerifyEmailPage from "../ui/components/VerifyEmailPage";
import ForgotPasswordPage from "../ui/components/ForgotPasswordPage";
import UnauthorizedPage from "../pages/auth/UnauthorizedPage";
import RolePortalLayout from "../ui/components/RolePortalLayout";
import DriverDashboard from "../pages/driver/DriverDashboard";
import DriverNotificationPage from "../pages/driver/DriverNotificationPage";
import DriverParkingSlotPage from "../pages/driver/DriverParkingSlotPage";
import MyVehiclesPage from "../pages/driver/MyVehiclesPage";
import BookingPage from "../pages/driver/BookingPage";
import BookingHistoryPage from "../pages/driver/BookingHistoryPage";
import CurrentSessionPage from "../pages/driver/CurrentSessionPage";
import DriverParkingMapPage from "../pages/driver/DriverParkingMapPage";
import DriverFindBuildingPage from "../pages/driver/DriverFindBuildingPage";
import PaymentHistoryPage from "../pages/driver/PaymentHistoryPage";
import RequestCenterPage from "../pages/driver/RequestCenterPage";
import DriverProfilePage from "../pages/driver/DriverProfilePage";
import StaffDashboard from "../pages/staff/StaffDashboard";
import StaffNotificationPage from "../pages/staff/StaffNotificationPage";
import UnifiedQrScanPage from "../pages/staff/UnifiedQrScanPage";
import StaffGatePage from "../pages/staff/GatePage";
import ParkingSessionPage from "../pages/staff/ParkingSessionPage";
import PaymentProcessingPage from "../pages/staff/PaymentProcessingPage";
import RequestProcessingPage from "../pages/staff/RequestProcessingPage";
import ExceptionCasePage from "../pages/staff/ExceptionCasePage";
import ManagerDashboard from "../pages/manager/ManagerDashboard";
import ManagerNotificationPage from "../pages/manager/ManagerNotificationPage";
import ReportsPage from "../pages/manager/ReportsPage";
<<<<<<< HEAD
import RevenueReportPage from "../pages/manager/RevenueReportPage";
=======
>>>>>>> 2f994eb249bcc671e13c698d817f6336e28ce1ab
import ParkingStructurePage from "../pages/parking/ParkingStructurePage";
import VehicleTypePage from "../pages/parking/VehicleTypePage";
import PricingPolicyPage from "../pages/manager/PricingPolicyPage";
import StaffShiftPage from "../pages/manager/StaffShiftPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import UserManagementPage from "../pages/user/UserManagementPage";
import RoleManagementPage from "../pages/admin/RoleManagementPage";
import SystemConfigPage from "../pages/admin/SystemConfigPage";
import ActivityLogPage from "../pages/admin/ActivityLogPage";
import PortalSettingsPage from "../pages/user/PortalSettingsPage";
import PaymentResultPage from "../pages/payment/PaymentResultPage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route element={<PublicLayout />}>
          <Route path="/parking-info" element={<Navigate to="/public-slots" replace />} />
          <Route path="/public-slots" element={<PublicSlotListPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/payment/result" element={<PaymentResultPage />} />

        <Route element={<ProtectedRoute allowedRoles={["DRIVER"]} />}>
          <Route path="/driver" element={<RolePortalLayout portal="driver" />}>
            <Route index element={<DriverDashboard />} />
            <Route path="vehicles" element={<MyVehiclesPage />} />
            <Route path="parking-slots" element={<DriverParkingSlotPage />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="bookings" element={<BookingHistoryPage />} />
            <Route path="current-session" element={<CurrentSessionPage />} />
            <Route path="parking-map" element={<DriverParkingMapPage />} />
            <Route path="find-building" element={<DriverFindBuildingPage />} />
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
            <Route path="gate" element={<StaffGatePage />} />
            <Route path="scan" element={<UnifiedQrScanPage />} />
            <Route path="entry" element={<StaffGatePage />} />
            <Route path="exit" element={<StaffGatePage />} />
            <Route path="qr" element={<Navigate to="/staff/entry" replace />} />
            <Route path="ocr" element={<Navigate to="/staff/entry" replace />} />
            <Route path="ocr-correction" element={<Navigate to="/staff/exceptions" replace />} />
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
            <Route path="parking-structure" element={<ParkingStructurePage />} />
            <Route path="buildings" element={<Navigate to="/manager/parking-structure" replace />} />
            <Route path="floors" element={<Navigate to="/manager/parking-structure" replace />} />
            <Route path="zones" element={<Navigate to="/manager/parking-structure" replace />} />
            <Route path="parking-slots" element={<Navigate to="/manager/parking-structure" replace />} />
            <Route path="gates" element={<Navigate to="/manager/parking-structure" replace />} />
            <Route path="vehicle-types" element={<VehicleTypePage />} />
            <Route path="pricing-policies" element={<PricingPolicyPage />} />
            <Route path="staff-shifts" element={<StaffShiftPage />} />
            <Route path="reports" element={<ReportsPage />} />
<<<<<<< HEAD
            <Route path="reports/revenue" element={<RevenueReportPage />} />
=======
>>>>>>> 2f994eb249bcc671e13c698d817f6336e28ce1ab
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
            <Route path="activity-logs" element={<ActivityLogPage />} />
            <Route path="settings" element={<PortalSettingsPage portal="admin" />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
