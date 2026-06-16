# Route Integration Audit

Updated: 2026-06-16

Legend:
- `real`: page is wired to backend APIs and has been verified with real data
- `partial`: page calls backend APIs but still has fallback fields, mixed local state, or incomplete workflow coverage
- `mock`: page is mainly powered by hardcoded/local mock data
- `untested`: route exists, looks wired, but has not been verified end-to-end yet

## Public

| Route | Page | Status | Notes | Test |
|---|---|---|---|---|
| `/` | `LandingPage` | `partial` | Reads public slot summary, but mostly marketing UI | not audited end-to-end |
| `/parking-info` | `ParkingInfoPage` | `real` | Uses building/floor/gate/zone/slot APIs | pass |
| `/public-slots` | `PublicSlotListPage` | `real` | Uses building/vehicle type/floor/zone/slot APIs | pass |
| `/login` | `LoginPage` | `real` | Uses auth login API | pass |
| `/register` | `RegisterPage` | `untested` | Uses auth register API | not verified |
| `/unauthorized` | `UnauthorizedPage` | `mock` | static page | n/a |

## Driver

| Route | Page | Status | Notes | Test |
|---|---|---|---|---|
| `/driver` | `DriverDashboard` | `partial` | Uses real vehicles/bookings/payments/notifications, but some UI fields still fallback because backend response is thin | partial pass |
| `/driver/vehicles` | `MyVehiclesPage` | `real` | Uses driver vehicle APIs | pass |
| `/driver/parking-slots` | `DriverParkingSlotPage` | `partial` | Calls real slot API, but hardcodes `vehicleTypeId=1` | not reliable |
| `/driver/booking` | `BookingPage` | `real` | Uses real vehicle list, available slots, booking create flow | pass |
| `/driver/bookings` | `BookingHistoryPage` | `real` | Uses real bookings and real pay-deposit flow | pass |
| `/driver/current-session` | `CurrentSessionPage` | `partial` | Reads real booking data, but building/floor/zone labels still rely on missing backend fields | partial pass |
| `/driver/payments` | `PaymentHistoryPage` | `real` | Uses real payment history API | pass |
| `/driver/requests` | `RequestCenterPage` | `real` | Uses request APIs | basic pass |
| `/driver/notifications` | `DriverNotificationPage` | `real` | Uses notification APIs | basic pass |
| `/driver/profile` | `DriverProfilePage` | `real` | Uses profile APIs | basic pass |
| `/driver/settings` | `PortalSettingsPage` | `mock` | local/settings style UI | not backend-bound |

## Staff

| Route | Page | Status | Notes | Test |
|---|---|---|---|---|
| `/staff` | `StaffDashboard` | `mock` | Driven by `staffPortalState` | not backend-bound |
| `/staff/entry` | `VehicleEntryPage` | `partial` | Building/gate/vehicle lookup use backend, but flow still mixes local `staffPortalState` | not fully verified |
| `/staff/exit` | `VehicleExitPage` | `mock` | Uses `staffPortalState` | not backend-bound |
| `/staff/qr` | `QrVerificationPage` | `mock` | Uses local QR logs in `staffPortalState` | not backend-bound |
| `/staff/ocr` | `OcrScanPage` | `partial` | API wiring exists but not fully verified in live workflow | untested end-to-end |
| `/staff/ocr-correction` | `OcrCorrectionPage` | `mock` | Uses `staffPortalState` | not backend-bound |
| `/staff/sessions` | `ParkingSessionPage` | `mock` | Uses `staffPortalState` | not backend-bound |
| `/staff/payments` | `PaymentProcessingPage` | `mock` | Uses `staffPortalState` | not backend-bound |
| `/staff/requests` | `RequestProcessingPage` | `mock` | Uses `staffPortalState` | not backend-bound |
| `/staff/exceptions` | `ExceptionCasePage` | `mock` | Uses `staffPortalState` | not backend-bound |
| `/staff/notifications` | `StaffNotificationPage` | `untested` | likely wired, not verified | not verified |
| `/staff/settings` | `PortalSettingsPage` | `mock` | local/settings style UI | not backend-bound |

## Manager

| Route | Page | Status | Notes | Test |
|---|---|---|---|---|
| `/manager` | `ManagerDashboard` | `partial` | Uses real building/floor/zone/slot/gate/vehicle type/pricing/staff shift/notification APIs, but not audited fully | partial pass |
| `/manager/buildings` | `BuildingPage` | `real` | CRUD with real APIs | basic pass |
| `/manager/floors` | `FloorPage` | `real` | CRUD with real APIs | basic pass |
| `/manager/zones` | `ZonePage` | `real` | CRUD with real APIs | basic pass |
| `/manager/parking-slots` | `ParkingSlotPage` | `real` | CRUD with real APIs | basic pass |
| `/manager/gates` | `GatePage` | `real` | CRUD with real APIs | basic pass |
| `/manager/vehicle-types` | `VehicleTypePage` | `real` | CRUD with real APIs | basic pass |
| `/manager/pricing-policies` | `PricingPolicyPage` | `real` | CRUD with real APIs | basic pass |
| `/manager/staff-shifts` | `StaffShiftPage` | `real` | Uses staff shift APIs | basic pass |
| `/manager/notifications` | `ManagerNotificationPage` | `untested` | likely wired, not verified | not verified |
| `/manager/settings` | `PortalSettingsPage` | `mock` | local/settings style UI | not backend-bound |

## Admin

| Route | Page | Status | Notes | Test |
|---|---|---|---|---|
| `/admin` | `AdminDashboard` | `partial` | Uses real users/roles APIs, but dashboard shaping still needs broader verification | partial pass |
| `/admin/users` | `UserManagementPage` | `real` | Uses user/role APIs | basic pass |
| `/admin/roles` | `RoleManagementPage` | `real` | Uses role APIs | basic pass |
| `/admin/system-config` | `SystemConfigPage` | `partial` | Uses real API, but response parsing should be normalized fully with `unwrapApiData` | needs cleanup |
| `/admin/settings` | `PortalSettingsPage` | `mock` | local/settings style UI | not backend-bound |

## Non-routed or Legacy Pages

These files exist but are not part of the current main route flow or are clearly mock-only:

| File | Status | Notes |
|---|---|---|
| `src/pages/dashboard/DashboardPage.jsx` | `mock` | hardcoded stats and activity |
| `src/pages/vehicle/VehiclePage.jsx` | `mock` | hardcoded vehicle list |
| `src/pages/admin/AdminReportsPage.jsx` | `mock` | hardcoded report cards |
| `src/pages/manager/ReportsPage.jsx` | `mock` | hardcoded report cards |
| `src/pages/staff/FeeCalculationPage.jsx` | `mock` | local price map only |

## Priority Follow-up

1. Replace `staffPortalState` flows with real staff/session/payment/request APIs.
2. Normalize backend responses for booking/session so driver dashboard and current session do not rely on fallback labels.
3. Fix `DriverParkingSlotPage` to derive `vehicleTypeId` from the selected real vehicle instead of hardcoding `1`.
4. Normalize `SystemConfigPage` response parsing with `unwrapApiData`.
5. Audit manager/admin/staff notification pages end-to-end.
