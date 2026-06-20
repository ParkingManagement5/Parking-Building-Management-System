# BE3 Swagger/Postman Manual Test Runbook

This runbook is for local/development BE3 evidence only. Git source code is the source of truth for endpoints, DTO fields, enum names, table names, and column names.

Do not write local database passwords, JWT secrets, or full JWT tokens into Git, screenshots, or this file.

Local MySQL credentials should be provided outside Git, for example:

```powershell
$env:SPRING_DATASOURCE_USERNAME="root"
$env:SPRING_DATASOURCE_PASSWORD="<local password>"
```

Known limitation: `application.yaml` may contain literal datasource credentials and a development JWT secret. Credential and JWT-secret externalization is a separate configuration/security task and is outside this docs-only runbook change.

## 1. Backend, Swagger, Login

Backend base URL:

```text
http://localhost:8080
```

Swagger UI:

```text
http://localhost:8080/swagger-ui.html
```

OpenAPI JSON:

```text
http://localhost:8080/api-docs
```

Login endpoint:

```http
POST /api/v1/auth/login
Content-Type: application/json
```

Development seed example:

```json
{
  "username": "staff1",
  "password": "Password123!"
}
```

JWT response field:

```text
data.token
```

Swagger security scheme:

```text
bearerAuth
```

In Swagger Authorize, paste the JWT token value. Do not add `Bearer` manually if Swagger is already using the bearer security scheme.

For Postman, use:

```http
Authorization: Bearer <jwt>
```

## 2. Development-Only Seed Accounts

These credentials are development/local-test seed credentials only. They are only guaranteed when the database was created from `parking_db_schema.sql`. Never use them in staging or production.

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `Password123!` | `ADMIN` |
| `manager` | `Password123!` | `MANAGER` |
| `staff1` | `Password123!` | `STAFF` |
| `driver1` | `Password123!` | `DRIVER` |
| `driver2` | `Password123!` | `DRIVER` |

If login fails:

* Do not guess a password.
* Do not modify authentication code.
* Check which seed source was used to create the current database.

Do not treat a password hash in `data.sql` as proof of a plaintext password.

## 3. Operating-Hours Preflight

Entry is validated against the entry gate building for:

```text
BOOKING
WALK_IN_AUTO
WALK_IN_MANUAL
```

Building inactive always blocks entry. Exit is not blocked by operating hours.

Check buildings before entry evidence:

```sql
SELECT building_id, name, open_time, close_time,
       is_24_hours + 0 AS is_24_hours, is_active
FROM parking_building
ORDER BY building_id;
```

Normal hours:

```text
open_time < close_time
open_time <= now < close_time
```

Example:

```text
06:00-22:00
21:59 valid
22:00 invalid
```

Overnight hours:

```text
open_time > close_time
now >= open_time OR now < close_time
```

Example:

```text
22:00-06:00
23:00 valid
02:00 valid
06:00 invalid
```

24/7:

```text
is_24_hours = true
```

When `is_24_hours = true`, entry ignores `open_time` and `close_time`, but the building must still be active.

Do not modify a shared building unless the tester has confirmed no teammate is using it. Always restore the exact captured values after testing.

### Step A - Capture Exact Old Values

```sql
SET @test_building_id = <replace_with_exact_building_id>;

SELECT
  is_24_hours + 0,
  open_time,
  close_time,
  is_active
INTO
  @old_is_24_hours,
  @old_open_time,
  @old_close_time,
  @old_is_active
FROM parking_building
WHERE building_id = @test_building_id;
```

### Step B - Enable Temporary 24/7 Before Evidence

```sql
UPDATE parking_building
SET is_24_hours = 1,
    is_active = true
WHERE building_id = @test_building_id;
```

### Step C - Restore Only After All Evidence Is Complete

```sql
UPDATE parking_building
SET is_24_hours = @old_is_24_hours,
    open_time = @old_open_time,
    close_time = @old_close_time,
    is_active = @old_is_active
WHERE building_id = @test_building_id;
```

## 4. Scenario Vehicle Isolation

Use separate vehicles for state-changing scenarios.

| Scenario | Vehicle |
| --- | --- |
| Walk-in AUTO | Vehicle A |
| Walk-in MANUAL | Vehicle B |
| Booking QR | Vehicle C |
| Security success entry | Vehicle D |

`ACTIVE` and `WAITING_PAYMENT` are open session statuses. Exit only changes a session from `ACTIVE` to `WAITING_PAYMENT`. Exit does not release the vehicle and does not release the slot.

Do not reuse a vehicle for another scenario while its session is still `ACTIVE` or `WAITING_PAYMENT`. Do not use the same license plate for AUTO and MANUAL. Reuse a vehicle only after valid completion or exact cleanup of data created by the current manual test run.

## 5. Gate To Building To Compatible Slot Preflight

Choose the exact entry gate first, then derive its building.

```sql
SET @entry_gate_id = <replace_with_exact_entry_gate_id>;
SET @building_id = NULL;

SELECT building_id
INTO @building_id
FROM gate
WHERE gate_id = @entry_gate_id
  AND is_active = true
  AND gate_type IN ('ENTRY', 'BOTH');

SELECT
  @entry_gate_id AS entry_gate_id,
  @building_id AS building_id;
```

If `@building_id` is null or empty, stop the scenario and choose a valid active `ENTRY` or `BOTH` gate.

Resetting `@building_id` before the `SELECT ... INTO` matters in MySQL because if the query returns no rows, the user variable can keep its value from a previous run.

### Available Slots - Not Yet Vehicle-Filtered

Use this only for inventory inspection. Do not pick a manual/booking slot from this query alone because it does not filter by vehicle size.

```sql
SELECT
  s.slot_id,
  s.slot_code,
  s.slot_size,
  s.status,
  z.zone_id,
  z.zone_name,
  f.floor_id,
  f.floor_number,
  b.building_id,
  b.name AS building_name
FROM parking_slot s
JOIN zone z
  ON z.zone_id = s.zone_id
JOIN floor f
  ON f.floor_id = z.floor_id
JOIN parking_building b
  ON b.building_id = f.building_id
WHERE s.status = 'AVAILABLE'
  AND s.is_active = true
  AND z.is_active = true
  AND f.is_active = true
  AND b.is_active = true
ORDER BY b.building_id, f.floor_number, s.slot_code, s.slot_id;
```

### Vehicle-Compatible Available Slot

Use this for `WALK_IN_MANUAL` and for selecting `slotId` when creating a booking.

```sql
SET @license_plate = '<replace_with_vehicle_license_plate>';

SELECT
  s.slot_id,
  s.slot_code,
  s.slot_size,
  s.status,
  v.vehicle_id,
  v.license_plate,
  vt.name AS vehicle_type,
  vt.slot_size AS required_slot_size,
  b.building_id,
  b.name AS building_name
FROM vehicle v
JOIN vehicle_type vt
  ON vt.vehicle_type_id = v.vehicle_type_id
JOIN parking_slot s
  ON s.slot_size = vt.slot_size
JOIN zone z
  ON z.zone_id = s.zone_id
JOIN floor f
  ON f.floor_id = z.floor_id
JOIN parking_building b
  ON b.building_id = f.building_id
WHERE v.license_plate = @license_plate
  AND v.is_active = true
  AND s.status = 'AVAILABLE'
  AND s.is_active = true
  AND z.is_active = true
  AND f.is_active = true
  AND b.is_active = true
  AND b.building_id = @building_id
ORDER BY f.floor_number, s.slot_code, s.slot_id;
```

Final slot-selection strategy:

```text
entry gate
-> building
-> vehicle required slot size
-> active AVAILABLE compatible slot
```

## 6. Session Entry Requests

Endpoint for all entry modes:

```http
POST /api/sessions/entry
Content-Type: application/json
Authorization: Bearer <staff_or_manager_or_admin_jwt>
```

Allowed roles:

```text
STAFF, MANAGER, ADMIN
```

`DRIVER` receives `403`. Missing JWT receives `401`.

### BOOKING QR Entry

```json
{
  "gateId": 101,
  "entryMode": "BOOKING",
  "qrToken": "<vehicle_c_booking_qr_token>"
}
```

Replace `gateId` `101` with the exact active `ENTRY` or `BOTH` gate ID for the same building as the booking's reserved slot. Do not send the placeholder `qrToken` literally. Do not send `licensePlate` or `slotId` for `BOOKING`.

### WALK_IN_AUTO

```json
{
  "gateId": 101,
  "entryMode": "WALK_IN_AUTO",
  "licensePlate": "<vehicle_a_license_plate>"
}
```

Replace `gateId` `101` with the exact chosen entry gate ID. Replace the license plate with Vehicle A. Vehicle A must not have an `ACTIVE` or `WAITING_PAYMENT` session. Do not send `slotId` for AUTO.

### WALK_IN_MANUAL

```json
{
  "gateId": 101,
  "entryMode": "WALK_IN_MANUAL",
  "licensePlate": "<vehicle_b_license_plate>",
  "slotId": 205
}
```

Replace `gateId` `101` with the exact chosen entry gate ID. Replace `slotId` `205` with the exact compatible `AVAILABLE` slot ID returned by the preflight SQL. Vehicle B and the selected slot must belong to the same building as the chosen gate.

## 7. Exit Request

Endpoint:

```http
POST /api/sessions/{sessionId}/exit
Content-Type: application/json
Authorization: Bearer <staff_or_manager_or_admin_jwt>
```

Request body:

```json
{
  "gateId": 102,
  "paymentMethod": "CASH"
}
```

Replace `gateId` `102` with an exact active `EXIT` or `BOTH` gate ID. `paymentMethod` is required by `SessionExitRequest`; the parking-session exit service does not complete payment.

Expected success:

* session `WAITING_PAYMENT`;
* `exit_time` set;
* slot still `OCCUPIED`;
* GateLog `EXIT` with `staff_user_id` from the authenticated actor.

## 8. Session Read Requests

Get session by ID:

```http
GET /api/sessions/{sessionId}
Authorization: Bearer <jwt>
```

Rules:

* `STAFF`, `MANAGER`, `ADMIN`: can read any session.
* `DRIVER`: can read only sessions for vehicles owned by that authenticated driver.
* driver owner gets `200`.
* driver non-owner gets `404`.
* missing session gets `404`.

My sessions:

```http
GET /api/sessions/my
Authorization: Bearer <driver_jwt>
```

Rules:

* `DRIVER` only.
* returns sessions for the authenticated driver's vehicles.

## 9. Booking Creation And QR Token

Booking creation request is separate from BOOKING QR session-entry request.

Create booking:

```http
POST /api/bookings
Content-Type: application/json
Authorization: Bearer <driver_jwt>
```

Booking creation body:

```json
{
  "vehicleId": 303,
  "slotId": 205,
  "bookingStartTime": "<replace_with_now_plus_at_least_15_minutes>",
  "bookingEndTime": "<replace_with_start_plus_2_hours>"
}
```

`vehicleId` and `slotId` are numeric IDs. `303` and `205` are example numbers only. Replace them with exact Vehicle C ID and exact compatible slot ID from SQL. Do not send literal time placeholders.

Booking-time strategy:

```text
start = current backend/JVM time + at least 15 minutes
end = start + 2 hours
```

Use at least 15 minutes because the service validates with `ChronoUnit.MINUTES.between(now, startTime)` and seconds can be truncated. Operating-hours `Clock` uses `Asia/Ho_Chi_Minh`. Booking validation uses `LocalDateTime.now()` from the JVM. The machine/JVM running the manual test should use Vietnam timezone.

`bookingEndTime` is optional in the DTO and backend defaults it to `start + 2h`, but evidence requests should include it explicitly to make verification easier.

After create, booking status is `PENDING_PAYMENT` and `qrToken` is null.

### Deposit Payment And QR Generation

Create deposit:

```http
POST /api/v1/payments/deposit?bookingId={bookingId}&depositAmount={depositAmount}&paymentMethod=CASH
Authorization: Bearer <jwt>
```

Confirm deposit:

```http
PUT /api/v1/payments/deposit/{paymentId}/confirm
Authorization: Bearer <jwt>
```

Payment confirmation calls `BookingService.confirmBookingAfterPayment(...)`, which:

* moves booking `PENDING_PAYMENT -> CONFIRMED`;
* sets `deposit_paid_at`;
* generates `qr_token`;
* changes the slot to `RESERVED`.

Read QR token:

```http
GET /api/bookings/{bookingId}
Authorization: Bearer <jwt>
```

Use:

```text
data.qrToken
```

There is also an internal simulation endpoint:

```http
PUT /api/bookings/{bookingId}/confirm-payment
Authorization: Bearer <staff_or_manager_or_admin_jwt>
```

It returns `data.qrToken`. Use it only to simulate BE4 deposit success during local manual evidence.

## 10. Payment Completion Boundary

BE3 has no public session-completion endpoint. Do not use or document a fake endpoint such as:

```text
POST /api/sessions/{id}/complete
```

ParkingSession completion is called internally after the payment boundary confirms a valid payment.

Existing Payment endpoint:

```http
PUT /api/v1/payments/parking-fee/{paymentId}/confirm?transactionRef={optional_ref}
Authorization: Bearer <jwt>
```

This is a Payment endpoint, not a public ParkingSession completion endpoint. `PaymentService.confirmParkingFee(...)` calls `ParkingSessionService.completeSessionAfterPayment(sessionId)`.

Completion evidence is conditional. It is only required when BE4 provides a valid `PARKING_FEE` payment or an approved test/admin setup has created a valid payment record.

If there is no valid parking-fee payment, BE3 standalone manual evidence ends at:

* session `WAITING_PAYMENT`;
* slot `OCCUPIED`;
* booking `CHECKED_IN` for booking flow;
* GateLog `ENTRY` + `EXIT`.

## 11. SQL Evidence Checks

### Confirmed Booking And Reserved Slot Preflight

```sql
SELECT
  b.booking_id,
  b.user_id,
  b.vehicle_id,
  v.license_plate,
  b.slot_id,
  s.slot_code,
  b.booking_start_time,
  b.booking_end_time,
  b.qr_token,
  b.qr_issued_at,
  b.qr_used_at,
  b.status
FROM booking b
JOIN vehicle v
  ON v.vehicle_id = b.vehicle_id
JOIN parking_slot s
  ON s.slot_id = b.slot_id
WHERE b.status = 'CONFIRMED'
ORDER BY b.booking_id DESC;
```

```sql
SELECT
  s.slot_id,
  s.slot_code,
  s.status,
  b.booking_id,
  b.status AS booking_status
FROM parking_slot s
LEFT JOIN booking b
  ON b.slot_id = s.slot_id
WHERE s.status = 'RESERVED'
ORDER BY s.slot_id;
```

### After Entry

ParkingSession `ACTIVE`:

```sql
SELECT session_id, booking_id, slot_id, vehicle_id, entry_gate_id,
       entry_time, exit_time, entry_mode, status
FROM parking_session
WHERE session_id = <exact_test_session_id>;
```

Slot `OCCUPIED`:

```sql
SELECT s.slot_id, s.slot_code, s.status
FROM parking_slot s
JOIN parking_session ps
  ON ps.slot_id = s.slot_id
WHERE ps.session_id = <exact_test_session_id>;
```

Booking `CHECKED_IN` for BOOKING entry:

```sql
SELECT booking_id, qr_used_at, status
FROM booking
WHERE booking_id = <exact_test_booking_id>;
```

GateLog `ENTRY` and authenticated actor:

```sql
SELECT gl.gate_log_id, gl.gate_id, gl.session_id, gl.staff_user_id, u.username,
       gl.license_plate, gl.event_type, gl.result_status, gl.event_time
FROM gate_log gl
LEFT JOIN users u
  ON u.user_id = gl.staff_user_id
WHERE gl.session_id = <exact_test_session_id>
  AND gl.event_type = 'ENTRY'
ORDER BY gl.gate_log_id;
```

Expected:

```text
session status = ACTIVE
slot status = OCCUPIED
booking status = CHECKED_IN for BOOKING
GateLog event_type = ENTRY
GateLog result_status = SUCCESS
staff_user_id belongs to authenticated actor
```

### After Exit

ParkingSession `WAITING_PAYMENT` and `exit_time` set:

```sql
SELECT session_id, exit_gate_id, entry_time, exit_time, status
FROM parking_session
WHERE session_id = <exact_test_session_id>;
```

Slot still `OCCUPIED`:

```sql
SELECT s.slot_id, s.slot_code, s.status
FROM parking_slot s
JOIN parking_session ps
  ON ps.slot_id = s.slot_id
WHERE ps.session_id = <exact_test_session_id>;
```

GateLog `EXIT`:

```sql
SELECT gl.gate_log_id, gl.gate_id, gl.session_id, gl.staff_user_id, u.username,
       gl.license_plate, gl.event_type, gl.result_status, gl.event_time
FROM gate_log gl
LEFT JOIN users u
  ON u.user_id = gl.staff_user_id
WHERE gl.session_id = <exact_test_session_id>
  AND gl.event_type = 'EXIT'
ORDER BY gl.gate_log_id;
```

Expected:

```text
session status = WAITING_PAYMENT
exit_time is not null
slot status = OCCUPIED
GateLog event_type = EXIT
GateLog result_status = MANUAL_CHECK
```

### After Payment Completion - Conditional

Run these only when the conditional payment-completion scenario is actually executed.

Session `COMPLETED`:

```sql
SELECT session_id, booking_id, slot_id, exit_time, status
FROM parking_session
WHERE session_id = <exact_test_session_id>;
```

Slot `AVAILABLE`:

```sql
SELECT s.slot_id, s.slot_code, s.status
FROM parking_slot s
JOIN parking_session ps
  ON ps.slot_id = s.slot_id
WHERE ps.session_id = <exact_test_session_id>;
```

Booking `COMPLETED` for booking session:

```sql
SELECT b.booking_id, b.status
FROM booking b
JOIN parking_session ps
  ON ps.booking_id = b.booking_id
WHERE ps.session_id = <exact_test_session_id>;
```

GateLog remains only `ENTRY` + `EXIT`:

```sql
SELECT event_type, COUNT(*) AS count_by_type
FROM gate_log
WHERE session_id = <exact_test_session_id>
GROUP BY event_type;
```

Completion does not create an additional GateLog.

## 12. Security Evidence

| Evidence | Request | Expected |
| --- | --- | --- |
| Unauthenticated entry | `POST /api/sessions/entry` without JWT | `401` |
| DRIVER entry | `POST /api/sessions/entry` with `driver1` JWT | `403` |
| STAFF entry success | `POST /api/sessions/entry` with `staff1` JWT and Vehicle D | `200`, session `ACTIVE` |
| DRIVER own session | `GET /api/sessions/{ownSessionId}` with owner driver JWT | `200` |
| DRIVER other session | `GET /api/sessions/{otherSessionId}` with non-owner driver JWT | `404` |
| Authenticated unknown route | `GET /api/does-not-exist` with any authenticated JWT | `404` |

Unknown unauthenticated `/api/**` routes return `401` because Spring Security requires authentication before MVC route handling.

## 13. Screenshot Evidence Naming

| Screenshot | Required |
| --- | --- |
| `BE3_01_login_staff_success.png` | yes |
| `BE3_02_login_driver_success.png` | yes |
| `BE3_03_booking_create_pending_payment.png` | yes |
| `BE3_04_deposit_confirm_qr_generated.png` | yes |
| `BE3_05_booking_qr_entry_active.png` | yes |
| `BE3_06_walkin_auto_active.png` | yes |
| `BE3_07_walkin_manual_active.png` | yes |
| `BE3_08_exit_waiting_payment.png` | yes |
| `BE3_09_payment_confirm_completed.png` | conditional |
| `BE3_10_driver_own_session_200.png` | yes |
| `BE3_11_driver_other_session_404.png` | yes |
| `BE3_12_driver_entry_403.png` | yes |
| `BE3_13_unauth_entry_401.png` | yes |
| `BE3_14_unknown_route_404.png` | yes |
| `BE3_15_sql_after_entry.png` | yes |
| `BE3_16_sql_after_exit.png` | yes |
| `BE3_17_sql_after_completion.png` | conditional |

Completion screenshots are conditional. They are only required when BE4 provides a valid `PARKING_FEE` payment or an approved test/admin setup has created a valid payment record.

Screenshots must not expose:

* local database password;
* full JWT token;
* JWT secret;
* other secrets.

If a JWT appears, mask the middle part while keeping enough prefix/suffix to identify the role-specific token.

## 14. Safe Cleanup SQL

Never clean up a pre-existing payment, session, booking, GateLog, vehicle, or slot owned by another teammate. Only clean data created by the current manual evidence run. Verify every exact ID before each `DELETE` or `UPDATE`. Never `DELETE` an entire table. Do not clean up seed users or seed vehicles.

Record exact IDs:

```sql
SET @session_id = <exact_test_session_id>;
SET @booking_id = <exact_test_booking_id>;
SET @booking_slot_id = <exact_test_booking_slot_id>;
SET @deposit_payment_id = <exact_test_deposit_payment_id>;
SET @parking_fee_payment_id = <exact_test_parking_fee_payment_id>;
```

For scenarios without one of these IDs, set it to `NULL` or skip the related statement.

Inspect before cleanup:

```sql
SELECT * FROM gate_log
WHERE session_id = @session_id;

SELECT * FROM payment
WHERE payment_id IN (@deposit_payment_id, @parking_fee_payment_id);

SELECT * FROM parking_session
WHERE session_id = @session_id;

SELECT * FROM booking
WHERE booking_id = @booking_id;

SELECT * FROM parking_slot
WHERE slot_id = @booking_slot_id;
```

Do not use broad payment cleanup such as `session_id = @session_id OR booking_id = @booking_id`. Delete payment only by exact payment IDs.

### Cleanup Scenario With ParkingSession

Restore the exact slot for the exact session after inspection:

```sql
UPDATE parking_slot s
JOIN parking_session ps
  ON ps.slot_id = s.slot_id
SET s.status = 'AVAILABLE'
WHERE ps.session_id = @session_id;
```

Delete in FK-safe order using exact IDs:

```sql
DELETE FROM gate_log
WHERE session_id = @session_id;

DELETE FROM payment
WHERE payment_id = @deposit_payment_id;

DELETE FROM payment
WHERE payment_id = @parking_fee_payment_id;

DELETE FROM parking_session
WHERE session_id = @session_id;

DELETE FROM booking
WHERE booking_id = @booking_id;
```

### Cleanup Booking Confirmed But Entry Failed

Use this when:

```text
Booking is CONFIRMED
Slot is RESERVED
Entry did not succeed
No ParkingSession exists
```

Inspect exact booking and exact slot:

```sql
SELECT
  b.booking_id,
  b.slot_id,
  b.status AS booking_status,
  s.status AS slot_status
FROM booking b
JOIN parking_slot s
  ON s.slot_id = b.slot_id
WHERE b.booking_id = @booking_id
  AND b.slot_id = @booking_slot_id;
```

Restore only the exact reserved slot for the exact booking:

```sql
UPDATE parking_slot s
JOIN booking b
  ON b.slot_id = s.slot_id
SET s.status = 'AVAILABLE'
WHERE b.booking_id = @booking_id
  AND b.slot_id = @booking_slot_id
  AND s.status = 'RESERVED';
```

Then delete exact payment IDs and exact booking ID:

```sql
DELETE FROM payment
WHERE payment_id = @deposit_payment_id;

DELETE FROM payment
WHERE payment_id = @parking_fee_payment_id;

DELETE FROM booking
WHERE booking_id = @booking_id;
```

## 15. Final Manual Review Checklist

Before capturing final evidence, confirm:

1. Swagger URL is `http://localhost:8080/swagger-ui.html`.
2. Login endpoint is `POST /api/v1/auth/login`.
3. JWT field is `data.token`.
4. BOOKING entry body uses only `gateId`, `entryMode`, and `qrToken`.
5. WALK_IN_AUTO body uses `gateId`, `entryMode`, and `licensePlate`.
6. WALK_IN_MANUAL body uses `gateId`, `entryMode`, `licensePlate`, and `slotId`.
7. Booking creation body is separate from BOOKING entry.
8. Operating hours cover normal, overnight, and 24/7.
9. Temporary 24/7 enable and restore are separate steps.
10. Vehicle A/B/C/D are not reused while open sessions exist.
11. Entry gate determines building before slot selection.
12. Slot query filters vehicle slot size and has no duplicate join alias.
13. Booking time is in the future by at least 15 minutes.
14. Seed credentials are marked development-only.
15. SQL evidence checks session, slot, booking, and GateLog.
16. Cleanup uses exact IDs only.
17. Cleanup handles reserved booking with no session.
18. Completion evidence is conditional.
19. No public session-completion endpoint is documented.
20. No local password, full JWT, or secret is added to evidence.
