-- Reset transactional parking data for a clean driver/staff test run.
-- Keeps master data: users, roles, buildings, floors, zones, vehicle types, gates, pricing policies.
-- Keeps driver vehicles so you can immediately book again.

USE parking_db;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM activity_log;
DELETE FROM exception_case;
DELETE FROM ocr_scan;
DELETE FROM gate_log;
DELETE FROM payment;
DELETE FROM parking_session;
DELETE FROM booking;

ALTER TABLE activity_log AUTO_INCREMENT = 1;
ALTER TABLE exception_case AUTO_INCREMENT = 1;
ALTER TABLE ocr_scan AUTO_INCREMENT = 1;
ALTER TABLE gate_log AUTO_INCREMENT = 1;
ALTER TABLE payment AUTO_INCREMENT = 1;
ALTER TABLE parking_session AUTO_INCREMENT = 1;
ALTER TABLE booking AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

UPDATE parking_slot
SET status = 'AVAILABLE',
    updated_at = NOW()
WHERE status <> 'MAINTENANCE';

-- Ensure driver1 has at least one active car and one active motorbike for quick testing.
INSERT INTO vehicle (
  owner_user_id,
  vehicle_type_id,
  license_plate,
  brand,
  model,
  color,
  is_active,
  created_at,
  updated_at
)
SELECT
  u.user_id,
  vt.vehicle_type_id,
  '66-AA-123456',
  'Honda',
  'Wave',
  'Blue',
  TRUE,
  NOW(),
  NOW()
FROM users u
JOIN vehicle_type vt ON UPPER(vt.name) IN ('MOTORBIKE', 'MOTORCYCLE')
WHERE u.username = 'driver1'
  AND NOT EXISTS (
    SELECT 1 FROM vehicle v WHERE v.license_plate = '66-AA-123456'
  )
LIMIT 1;

INSERT INTO vehicle (
  owner_user_id,
  vehicle_type_id,
  license_plate,
  brand,
  model,
  color,
  is_active,
  created_at,
  updated_at
)
SELECT
  u.user_id,
  vt.vehicle_type_id,
  '51A-12345',
  'Toyota',
  'Camry',
  'Silver',
  TRUE,
  NOW(),
  NOW()
FROM users u
JOIN vehicle_type vt ON UPPER(vt.name) IN ('CAR')
WHERE u.username = 'driver1'
  AND NOT EXISTS (
    SELECT 1 FROM vehicle v WHERE v.license_plate = '51A-12345'
  )
LIMIT 1;

UPDATE vehicle
SET is_active = TRUE,
    updated_at = NOW()
WHERE license_plate IN ('66-AA-123456', '51A-12345');

SELECT
  (SELECT COUNT(*) FROM booking) AS bookings,
  (SELECT COUNT(*) FROM parking_session) AS sessions,
  (SELECT COUNT(*) FROM payment) AS payments,
  (SELECT COUNT(*) FROM parking_slot WHERE status = 'OCCUPIED') AS occupied_slots,
  (SELECT COUNT(*) FROM parking_slot WHERE status = 'RESERVED') AS reserved_slots;
