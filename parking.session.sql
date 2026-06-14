-- Seed test data for driver1 so frontend Driver portal has real Vehicles and Notifications
-- Safe to run multiple times on MySQL because each INSERT is guarded by NOT EXISTS.

-- Vehicles for driver1 (user_id = 4 in backend seed data)
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
JOIN vehicle_type vt ON vt.name = 'Car'
WHERE u.username = 'driver1'
  AND NOT EXISTS (
    SELECT 1
    FROM vehicle v
    WHERE v.license_plate = '51A-12345'
  );

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
  '59B1-88888',
  'Honda',
  'Civic',
  'Black',
  TRUE,
  NOW(),
  NOW()
FROM users u
JOIN vehicle_type vt ON vt.name = 'Car'
WHERE u.username = 'driver1'
  AND NOT EXISTS (
    SELECT 1
    FROM vehicle v
    WHERE v.license_plate = '59B1-88888'
  );

-- Notifications for driver1
INSERT INTO notification (
  user_id,
  title,
  body,
  type,
  entity_type,
  entity_id,
  is_read,
  created_at
)
SELECT
  u.user_id,
  'Booking confirmed',
  'Your parking slot B05 at City Center Parking is confirmed for today.',
  'success',
  'BOOKING',
  1001,
  FALSE,
  DATE_SUB(NOW(), INTERVAL 15 MINUTE)
FROM users u
WHERE u.username = 'driver1'
  AND NOT EXISTS (
    SELECT 1
    FROM notification n
    WHERE n.user_id = u.user_id
      AND n.title = 'Booking confirmed'
  );

INSERT INTO notification (
  user_id,
  title,
  body,
  type,
  entity_type,
  entity_id,
  is_read,
  created_at
)
SELECT
  u.user_id,
  'Session reminder',
  'Your active parking session will end in 30 minutes. Please prepare for exit.',
  'warning',
  'SESSION',
  1002,
  FALSE,
  DATE_SUB(NOW(), INTERVAL 2 HOUR)
FROM users u
WHERE u.username = 'driver1'
  AND NOT EXISTS (
    SELECT 1
    FROM notification n
    WHERE n.user_id = u.user_id
      AND n.title = 'Session reminder'
  );

INSERT INTO notification (
  user_id,
  title,
  body,
  type,
  entity_type,
  entity_id,
  is_read,
  created_at
)
SELECT
  u.user_id,
  'Vehicle added',
  'Your vehicle 59B1-88888 has been added successfully to your driver account.',
  'info',
  'VEHICLE',
  1003,
  TRUE,
  DATE_SUB(NOW(), INTERVAL 1 DAY)
FROM users u
WHERE u.username = 'driver1'
  AND NOT EXISTS (
    SELECT 1
    FROM notification n
    WHERE n.user_id = u.user_id
      AND n.title = 'Vehicle added'
  );

-- Shift templates for staff portal and manager dashboard
INSERT INTO shift (shift_name, start_time, end_time)
SELECT 'Morning Shift', '06:00:00', '14:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM shift s WHERE s.shift_name = 'Morning Shift'
);

INSERT INTO shift (shift_name, start_time, end_time)
SELECT 'Afternoon Shift', '14:00:00', '22:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM shift s WHERE s.shift_name = 'Afternoon Shift'
);

-- Staff shift assignment for staff1
INSERT INTO staff_shift (staff_user_id, shift_id, working_date)
SELECT
  u.user_id,
  s.shift_id,
  CURDATE()
FROM users u
JOIN shift s ON s.shift_name = 'Morning Shift'
WHERE u.username = 'staff1'
  AND NOT EXISTS (
    SELECT 1
    FROM staff_shift ss
    WHERE ss.staff_user_id = u.user_id
      AND ss.shift_id = s.shift_id
      AND ss.working_date = CURDATE()
  );

-- Notifications for staff1
INSERT INTO notification (
  user_id,
  title,
  body,
  type,
  entity_type,
  entity_id,
  is_read,
  created_at
)
SELECT
  u.user_id,
  'Shift assigned',
  'You have been assigned to Morning Shift for today at City Center Parking.',
  'info',
  'SHIFT',
  2001,
  FALSE,
  DATE_SUB(NOW(), INTERVAL 40 MINUTE)
FROM users u
WHERE u.username = 'staff1'
  AND NOT EXISTS (
    SELECT 1
    FROM notification n
    WHERE n.user_id = u.user_id
      AND n.title = 'Shift assigned'
  );

INSERT INTO notification (
  user_id,
  title,
  body,
  type,
  entity_type,
  entity_id,
  is_read,
  created_at
)
SELECT
  u.user_id,
  'Gate alert',
  'Gate A requires manual review for one incoming vehicle.',
  'warning',
  'GATE',
  2002,
  FALSE,
  DATE_SUB(NOW(), INTERVAL 90 MINUTE)
FROM users u
WHERE u.username = 'staff1'
  AND NOT EXISTS (
    SELECT 1
    FROM notification n
    WHERE n.user_id = u.user_id
      AND n.title = 'Gate alert'
  );

-- Notifications for manager1
INSERT INTO notification (
  user_id,
  title,
  body,
  type,
  entity_type,
  entity_id,
  is_read,
  created_at
)
SELECT
  u.user_id,
  'Occupancy update',
  'Mall Parking availability dropped below 30% this morning.',
  'warning',
  'BUILDING',
  3001,
  FALSE,
  DATE_SUB(NOW(), INTERVAL 25 MINUTE)
FROM users u
WHERE u.username = 'manager1'
  AND NOT EXISTS (
    SELECT 1
    FROM notification n
    WHERE n.user_id = u.user_id
      AND n.title = 'Occupancy update'
  );

INSERT INTO notification (
  user_id,
  title,
  body,
  type,
  entity_type,
  entity_id,
  is_read,
  created_at
)
SELECT
  u.user_id,
  'Staff coverage ready',
  'Today''s staff shift coverage has been fully assigned.',
  'success',
  'SHIFT',
  3002,
  TRUE,
  DATE_SUB(NOW(), INTERVAL 4 HOUR)
FROM users u
WHERE u.username = 'manager1'
  AND NOT EXISTS (
    SELECT 1
    FROM notification n
    WHERE n.user_id = u.user_id
      AND n.title = 'Staff coverage ready'
  );

-- Notifications for admin
INSERT INTO notification (
  user_id,
  title,
  body,
  type,
  entity_type,
  entity_id,
  is_read,
  created_at
)
SELECT
  u.user_id,
  'System config changed',
  'Booking window and OCR threshold were updated successfully.',
  'info',
  'SYSTEM_CONFIG',
  4001,
  FALSE,
  DATE_SUB(NOW(), INTERVAL 55 MINUTE)
FROM users u
WHERE u.username = 'admin'
  AND NOT EXISTS (
    SELECT 1
    FROM notification n
    WHERE n.user_id = u.user_id
      AND n.title = 'System config changed'
  );

INSERT INTO notification (
  user_id,
  title,
  body,
  type,
  entity_type,
  entity_id,
  is_read,
  created_at
)
SELECT
  u.user_id,
  'New user registered',
  'A new driver account was created and is now active in the system.',
  'success',
  'USER',
  4002,
  TRUE,
  DATE_SUB(NOW(), INTERVAL 1 DAY)
FROM users u
WHERE u.username = 'admin'
  AND NOT EXISTS (
    SELECT 1
    FROM notification n
    WHERE n.user_id = u.user_id
      AND n.title = 'New user registered'
  );
