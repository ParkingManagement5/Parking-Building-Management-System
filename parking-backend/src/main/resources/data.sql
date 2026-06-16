-- Initial test data for parking system

-- 1. INSERT ROLES (only role_id and role_name columns exist)
INSERT INTO role (role_name) VALUES
('ADMIN'),
('MANAGER'),
('STAFF'),
('DRIVER');

-- 2. INSERT USERS (table is "users" not "user")
INSERT INTO users (username, password_hash, email, phone, full_name, status) VALUES
('admin', '$2y$10$UOTImv2WAutYPvV.s0Edt.CSqL5RzC7lH3rCP6B0RfkOGgOllA2ea', 'admin@parking.com', '0901000001', 'Admin User', 'ACTIVE'),
('manager1', '$2y$10$UOTImv2WAutYPvV.s0Edt.CSqL5RzC7lH3rCP6B0RfkOGgOllA2ea', 'manager@parking.com', '0901000002', 'Manager One', 'ACTIVE'),
('staff1', '$2y$10$UOTImv2WAutYPvV.s0Edt.CSqL5RzC7lH3rCP6B0RfkOGgOllA2ea', 'staff@parking.com', '0901000003', 'Staff Member', 'ACTIVE'),
('driver1', '$2y$10$UOTImv2WAutYPvV.s0Edt.CSqL5RzC7lH3rCP6B0RfkOGgOllA2ea', 'driver@parking.com', '0901000004', 'Driver One', 'ACTIVE');

-- 3. INSERT USER_ROLES
INSERT INTO user_role (user_id, role_id) VALUES
(1, 1),  -- admin has ADMIN role
(2, 2),  -- manager1 has MANAGER role
(3, 3),  -- staff1 has STAFF role
(4, 4);  -- driver1 has DRIVER role

-- 4. INSERT VEHICLE TYPES (columns: name, description, slot_size, hourly_rate, daily_rate, is_active)
INSERT INTO vehicle_type (name, description, slot_size, hourly_rate, daily_rate, is_active) VALUES
('Motorcycle', 'Two-wheeler motorcycle', 'SMALL', 10000.00, 50000.00, true),
('Car', 'Four-wheeler sedan', 'MEDIUM', 30000.00, 150000.00, true),
('SUV', 'Sport Utility Vehicle', 'LARGE', 50000.00, 250000.00, true);

-- 5. INSERT PARKING BUILDINGS (columns: name, address, phone, email, description, open_time, close_time, status, is_active)
INSERT INTO parking_building (name, address, phone, email, description, open_time, close_time, status, is_active) VALUES
('City Center Parking', '123 Main Street, Downtown', '0201234567', 'citypark@parking.com', 'Downtown parking facility', '06:00:00', '23:00:00', 'ACTIVE', true),
('Mall Parking', '456 Shopping Avenue, Mall Zone', '0201234568', 'mallpark@parking.com', 'Shopping mall parking', '07:00:00', '22:00:00', 'ACTIVE', true);

-- 6. INSERT FLOORS (columns: building_id, floor_number, name, capacity, status, is_active)
INSERT INTO floor (building_id, floor_number, name, capacity, status, is_active) VALUES
(1, 1, 'Floor 1', 50, 'ACTIVE', true),
(1, 2, 'Floor 2', 50, 'ACTIVE', true),
(1, -1, 'Basement B1', 50, 'ACTIVE', true),
(2, 1, 'Level 1', 75, 'ACTIVE', true);

-- 7. INSERT ZONES (columns: floor_id, vehicle_type_id, name, description, status, is_active)
INSERT INTO zone (floor_id, vehicle_type_id, name, description, status, is_active) VALUES
(1, 1, 'Zone A - Motorcycle', 'Motorcycle parking area', 'ACTIVE', true),
(1, 2, 'Zone B - Car', 'Car parking area', 'ACTIVE', true),
(2, 3, 'Zone C - SUV', 'Large vehicle parking area', 'ACTIVE', true),
(3, 2, 'Zone D - Basement', 'Basement car parking', 'ACTIVE', true),
(4, 2, 'Zone E - Mall Car', 'Mall parking for cars', 'ACTIVE', true);

-- 8. INSERT PARKING SLOTS (columns: zone_id, slot_code, slot_size, status, is_active)
INSERT INTO parking_slot (zone_id, slot_code, slot_size, status, is_active) VALUES
-- Zone 1 (Motorcycle) - 10 slots
(1, 'A01', 'SMALL', 'AVAILABLE', true),
(1, 'A02', 'SMALL', 'AVAILABLE', true),
(1, 'A03', 'SMALL', 'AVAILABLE', true),
(1, 'A04', 'SMALL', 'AVAILABLE', true),
(1, 'A05', 'SMALL', 'AVAILABLE', true),
(1, 'A06', 'SMALL', 'AVAILABLE', true),
(1, 'A07', 'SMALL', 'OCCUPIED', true),
(1, 'A08', 'SMALL', 'MAINTENANCE', true),
(1, 'A09', 'SMALL', 'AVAILABLE', true),
(1, 'A10', 'SMALL', 'RESERVED', true),

-- Zone 2 (Car) - 10 slots
(2, 'B01', 'MEDIUM', 'AVAILABLE', true),
(2, 'B02', 'MEDIUM', 'AVAILABLE', true),
(2, 'B03', 'MEDIUM', 'AVAILABLE', true),
(2, 'B04', 'MEDIUM', 'OCCUPIED', true),
(2, 'B05', 'MEDIUM', 'AVAILABLE', true),
(2, 'B06', 'MEDIUM', 'AVAILABLE', true),
(2, 'B07', 'MEDIUM', 'MAINTENANCE', true),
(2, 'B08', 'MEDIUM', 'AVAILABLE', true),
(2, 'B09', 'MEDIUM', 'AVAILABLE', true),
(2, 'B10', 'MEDIUM', 'AVAILABLE', true),

-- Zone 3 (SUV) - 8 slots
(3, 'C01', 'LARGE', 'AVAILABLE', true),
(3, 'C02', 'LARGE', 'AVAILABLE', true),
(3, 'C03', 'LARGE', 'OCCUPIED', true),
(3, 'C04', 'LARGE', 'AVAILABLE', true),
(3, 'C05', 'LARGE', 'AVAILABLE', true),
(3, 'C06', 'LARGE', 'AVAILABLE', true),
(3, 'C07', 'LARGE', 'AVAILABLE', true),
(3, 'C08', 'LARGE', 'MAINTENANCE', true),

-- Zone 4 (Basement) - 10 slots
(4, 'D01', 'MEDIUM', 'AVAILABLE', true),
(4, 'D02', 'MEDIUM', 'AVAILABLE', true),
(4, 'D03', 'MEDIUM', 'AVAILABLE', true),
(4, 'D04', 'MEDIUM', 'AVAILABLE', true),
(4, 'D05', 'MEDIUM', 'OCCUPIED', true),
(4, 'D06', 'MEDIUM', 'AVAILABLE', true),
(4, 'D07', 'MEDIUM', 'AVAILABLE', true),
(4, 'D08', 'MEDIUM', 'AVAILABLE', true),
(4, 'D09', 'MEDIUM', 'AVAILABLE', true),
(4, 'D10', 'MEDIUM', 'AVAILABLE', true),

-- Zone 5 (Mall Car) - 15 slots
(5, 'E01', 'MEDIUM', 'AVAILABLE', true),
(5, 'E02', 'MEDIUM', 'AVAILABLE', true),
(5, 'E03', 'MEDIUM', 'AVAILABLE', true),
(5, 'E04', 'MEDIUM', 'AVAILABLE', true),
(5, 'E05', 'MEDIUM', 'AVAILABLE', true),
(5, 'E06', 'MEDIUM', 'OCCUPIED', true),
(5, 'E07', 'MEDIUM', 'AVAILABLE', true),
(5, 'E08', 'MEDIUM', 'AVAILABLE', true),
(5, 'E09', 'MEDIUM', 'AVAILABLE', true),
(5, 'E10', 'MEDIUM', 'AVAILABLE', true),
(5, 'E11', 'MEDIUM', 'AVAILABLE', true),
(5, 'E12', 'MEDIUM', 'MAINTENANCE', true),
(5, 'E13', 'MEDIUM', 'AVAILABLE', true),
(5, 'E14', 'MEDIUM', 'AVAILABLE', true),
(5, 'E15', 'MEDIUM', 'AVAILABLE', true);

-- 9. INSERT GATES (columns: building_id, gate_code, gate_type, is_active)
INSERT INTO gate (building_id, gate_code, gate_type, is_active) VALUES
(1, 'GATE-A1', 'ENTRY', true),
(1, 'GATE-A2', 'EXIT', true),
(1, 'GATE-A3', 'ENTRY', true),
(2, 'GATE-B1', 'ENTRY', true),
(2, 'GATE-B2', 'EXIT', true);
