-- ============================================================
-- parking_db — FULL SCRIPT (Schema + Seed Data)
-- Chạy file này là xong, không cần làm gì thêm
-- Accounts: admin/manager/staff1/driver1/driver2 — Password123!
-- 2 loại xe: MOTORBIKE, CAR
-- 2 tầng: Tầng 1 (Moto), Tầng 2 (Car)
-- Mỗi tầng 6 zone, mỗi zone 6 slot → 72 slots tổng
-- ============================================================

DROP DATABASE IF EXISTS parking_db;
CREATE DATABASE parking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parking_db;

CREATE TABLE `parking_building` (
    `building_id` int PRIMARY KEY AUTO_INCREMENT,
    `name` varchar(100) NOT NULL,
    `address` varchar(255) NOT NULL,
    `phone` varchar(20),
    `email` varchar(100),
    `description` text,
    `open_time` time NOT NULL,
    `close_time` time NOT NULL,
    `is_active` boolean NOT NULL DEFAULT true,
    `created_at` datetime NOT NULL,
    `updated_at` datetime
);

CREATE TABLE `floor` (
    `floor_id` int PRIMARY KEY AUTO_INCREMENT,
    `building_id` int NOT NULL,
    `floor_number` int NOT NULL,
    `floor_name` varchar(50) NOT NULL,
    `capacity` int NOT NULL DEFAULT 0,
    `is_active` boolean NOT NULL DEFAULT true,
    `created_at` datetime NOT NULL,
    `updated_at` datetime,
    UNIQUE KEY `uk_floor_building_number` (`building_id`, `floor_number`)
);

CREATE TABLE `vehicle_type` (
    `vehicle_type_id` int PRIMARY KEY AUTO_INCREMENT,
    `name` varchar(50) UNIQUE NOT NULL,
    `description` varchar(255),
    `slot_size` varchar(20) NOT NULL,
    `hourly_rate` decimal(10,2) NOT NULL DEFAULT 0,
    `daily_rate` decimal(10,2),
    `is_active` boolean NOT NULL DEFAULT true,
    `created_at` datetime NOT NULL,
    `updated_at` datetime
);

CREATE TABLE `zone` (
    `zone_id` int PRIMARY KEY AUTO_INCREMENT,
    `floor_id` int NOT NULL,
    `vehicle_type_id` int NOT NULL,
    `zone_name` varchar(50) NOT NULL,
    `description` varchar(255),
    `is_active` boolean NOT NULL DEFAULT true,
    `created_at` datetime NOT NULL,
    `updated_at` datetime,
    UNIQUE KEY `uk_zone_floor_name` (`floor_id`, `zone_name`)
);

CREATE TABLE `parking_slot` (
    `slot_id` int PRIMARY KEY AUTO_INCREMENT,
    `zone_id` int NOT NULL,
    `slot_code` varchar(20) NOT NULL,
    `slot_size` varchar(20) NOT NULL,
    `priority` int,
    `distance_to_gate` int,
    `status` varchar(20) NOT NULL,
    `is_active` boolean NOT NULL DEFAULT true,
    `created_at` datetime NOT NULL,
    `updated_at` datetime,
    UNIQUE KEY `uk_slot_zone_code` (`zone_id`, `slot_code`)
);

CREATE TABLE `gate` (
    `gate_id` int PRIMARY KEY AUTO_INCREMENT,
    `building_id` int NOT NULL,
    `gate_code` varchar(50) UNIQUE NOT NULL,
    `gate_type` varchar(20) NOT NULL,
    `is_active` boolean NOT NULL DEFAULT true,
    `created_at` datetime NOT NULL,
    `updated_at` datetime
);

CREATE TABLE `users` (
    `user_id` int PRIMARY KEY AUTO_INCREMENT,
    `username` varchar(50) UNIQUE NOT NULL,
    `full_name` varchar(100) NOT NULL,
    `email` varchar(100) UNIQUE NOT NULL,
    `phone` varchar(20),
    `password_hash` varchar(255) NOT NULL,
    `email_verification_code` varchar(10),
    `email_verification_expires_at` datetime,
    `password_reset_otp` varchar(10),
    `password_reset_otp_expires_at` datetime,
    `status` varchar(20) NOT NULL,
    `assigned_building_id` int DEFAULT NULL,
    `created_at` datetime,
    `updated_at` datetime
);

CREATE TABLE `role` (
    `role_id` int PRIMARY KEY AUTO_INCREMENT,
    `role_name` varchar(50) UNIQUE NOT NULL
);

CREATE TABLE `user_role` (
    `user_id` int NOT NULL,
    `role_id` int NOT NULL,
    PRIMARY KEY (`user_id`, `role_id`)
);

CREATE TABLE `password_reset_token` (
    `token_id` int PRIMARY KEY AUTO_INCREMENT,
    `user_id` int NOT NULL,
    `token` varchar(255) UNIQUE NOT NULL,
    `expires_at` datetime NOT NULL,
    `used` boolean NOT NULL DEFAULT false,
    `created_at` datetime
);

CREATE TABLE `vehicle` (
    `vehicle_id` int PRIMARY KEY AUTO_INCREMENT,
    `owner_user_id` int NOT NULL,
    `vehicle_type_id` int NOT NULL,
    `license_plate` varchar(20) UNIQUE NOT NULL,
    `brand` varchar(50),
    `model` varchar(50),
    `color` varchar(30),
    `is_active` boolean NOT NULL DEFAULT true,
    `created_at` datetime NOT NULL,
    `updated_at` datetime
);

CREATE TABLE `booking` (
    `booking_id` int PRIMARY KEY AUTO_INCREMENT,
    `user_id` int NOT NULL,
    `vehicle_id` int NOT NULL,
    `slot_id` int NOT NULL,
    `booking_start_time` datetime,
    `booking_end_time` datetime,
    `reserved_at` datetime,
    `expired_at` datetime,
    `qr_token` varchar(500) UNIQUE,
    `qr_issued_at` datetime,
    `qr_used_at` datetime,
    `deposit_amount` decimal(10,2) DEFAULT 0,
    `deposit_paid_at` datetime,
    `status` varchar(30) NOT NULL,
    `created_at` datetime,
    `updated_at` datetime
);

CREATE TABLE `parking_session` (
    `session_id` int PRIMARY KEY AUTO_INCREMENT,
    `booking_id` int,
    `slot_id` int NOT NULL,
    `user_id` int NOT NULL,
    `vehicle_id` int NOT NULL,
    `entry_gate_id` int,
    `exit_gate_id` int,
    `entry_time` datetime,
    `exit_time` datetime,
    `entry_mode` varchar(20) NOT NULL,
    `status` varchar(30) NOT NULL,
    `created_at` datetime,
    `updated_at` datetime
);

CREATE TABLE `payment` (
    `payment_id` int PRIMARY KEY AUTO_INCREMENT,
    `session_id` int,
    `booking_id` int,
    `policy_id` int,
    `payment_type` varchar(20) NOT NULL,
    `applied_rate` decimal(10,2),
    `base_fee` decimal(12,2),
    `overtime_fee` decimal(12,2),
    `penalty_fee` decimal(12,2),
    `discount` decimal(12,2),
    `deposit_deducted` decimal(12,2),
    `total_amount` decimal(12,2) NOT NULL,
    `transaction_ref` varchar(100) UNIQUE,
    `payment_method` varchar(20) NOT NULL,
    `payment_status` varchar(20) NOT NULL,
    `paid_at` datetime,
    `created_at` datetime,
    `updated_at` datetime
);

CREATE TABLE `pricing_policy` (
    `policy_id` int PRIMARY KEY AUTO_INCREMENT,
    `vehicle_type_id` int NOT NULL,
    `time_type` varchar(20) NOT NULL,
    `day_type` varchar(20) NOT NULL,
    `start_hour` int,
    `end_hour` int,
    `price_per_hour` decimal(10,2) NOT NULL,
    `is_active` boolean NOT NULL DEFAULT true,
    `created_at` datetime,
    `updated_at` datetime
);

CREATE TABLE `gate_log` (
    `gate_log_id` int PRIMARY KEY AUTO_INCREMENT,
    `gate_id` int NOT NULL,
    `session_id` int,
    `staff_user_id` int,
    `license_plate` varchar(20),
    `event_type` varchar(30) NOT NULL,
    `result_status` varchar(20) NOT NULL,
    `event_time` datetime NOT NULL,
    `created_at` datetime,
    `updated_at` datetime
);

CREATE TABLE `ocr_scan` (
    `scan_id` int PRIMARY KEY AUTO_INCREMENT,
    `session_id` int,
    `gate_id` int,
    `image_path` varchar(500),
    `detected_plate` varchar(20),
    `plate_confidence_score` float,
    `corrected_plate` varchar(20),
    `is_corrected` boolean NOT NULL DEFAULT false,
    `corrected_by_user_id` int,
    `corrected_at` datetime,
    `correction_reason` varchar(255),
    `trigger_type` varchar(20) NOT NULL,
    `process_status` varchar(30) NOT NULL,
    `scanned_at` datetime,
    `created_at` datetime NOT NULL,
    `updated_at` datetime
);

CREATE TABLE `request` (
    `request_id` int PRIMARY KEY AUTO_INCREMENT,
    `user_id` int NOT NULL,
    `assigned_staff_id` int,
    `request_type` varchar(30) NOT NULL,
    `subject` varchar(200),
    `description` text,
    `status` varchar(20) NOT NULL,
    `resolved_at` datetime,
    `created_at` datetime,
    `updated_at` datetime
);

CREATE TABLE `exception_case` (
    `exception_id` int PRIMARY KEY AUTO_INCREMENT,
    `session_id` int,
    `request_id` int,
    `exception_type` varchar(30) NOT NULL,
    `description` varchar(500),
    `status` varchar(20) NOT NULL,
    `resolved_by` int,
    `resolved_at` datetime,
    `created_at` datetime,
    `updated_at` datetime
);

CREATE TABLE `notification` (
    `notification_id` int PRIMARY KEY AUTO_INCREMENT,
    `user_id` int NOT NULL,
    `title` varchar(200) NOT NULL,
    `body` text,
    `type` varchar(50),
    `entity_type` varchar(30),
    `entity_id` int,
    `is_read` boolean NOT NULL DEFAULT false,
    `created_at` datetime
);

CREATE TABLE `activity_log` (
    `log_id` bigint PRIMARY KEY AUTO_INCREMENT,
    `user_id` int,
    `action_type` varchar(50),
    `action` varchar(200) NOT NULL,
    `ip_address` varchar(50),
    `created_at` datetime
);

CREATE TABLE `shift` (
    `shift_id` int PRIMARY KEY AUTO_INCREMENT,
    `shift_name` varchar(50) NOT NULL,
    `start_time` time NOT NULL,
    `end_time` time NOT NULL,
    `status` varchar(20) NOT NULL
);

CREATE TABLE `staff_shift` (
    `staff_shift_id` int PRIMARY KEY AUTO_INCREMENT,
    `staff_user_id` int NOT NULL,
    `shift_id` int NOT NULL,
    `working_date` date NOT NULL
);

CREATE TABLE `system_config` (
    `config_id` bigint PRIMARY KEY AUTO_INCREMENT,
    `config_key` varchar(100) UNIQUE NOT NULL,
    `config_value` varchar(255),
    `description` varchar(255),
    `updated_by` int,
    `updated_at` datetime
);

ALTER TABLE `floor` ADD FOREIGN KEY (`building_id`) REFERENCES `parking_building` (`building_id`);
ALTER TABLE `zone` ADD FOREIGN KEY (`floor_id`) REFERENCES `floor` (`floor_id`);
ALTER TABLE `zone` ADD FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_type` (`vehicle_type_id`);
ALTER TABLE `parking_slot` ADD FOREIGN KEY (`zone_id`) REFERENCES `zone` (`zone_id`);
ALTER TABLE `gate` ADD FOREIGN KEY (`building_id`) REFERENCES `parking_building` (`building_id`);
ALTER TABLE `users` ADD FOREIGN KEY (`assigned_building_id`) REFERENCES `parking_building` (`building_id`);
ALTER TABLE `user_role` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `user_role` ADD FOREIGN KEY (`role_id`) REFERENCES `role` (`role_id`);
ALTER TABLE `password_reset_token` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `vehicle` ADD FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `vehicle` ADD FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_type` (`vehicle_type_id`);
ALTER TABLE `booking` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `booking` ADD FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle` (`vehicle_id`);
ALTER TABLE `booking` ADD FOREIGN KEY (`slot_id`) REFERENCES `parking_slot` (`slot_id`);
ALTER TABLE `parking_session` ADD FOREIGN KEY (`booking_id`) REFERENCES `booking` (`booking_id`);
ALTER TABLE `parking_session` ADD FOREIGN KEY (`slot_id`) REFERENCES `parking_slot` (`slot_id`);
ALTER TABLE `parking_session` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `parking_session` ADD FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle` (`vehicle_id`);
ALTER TABLE `parking_session` ADD FOREIGN KEY (`entry_gate_id`) REFERENCES `gate` (`gate_id`);
ALTER TABLE `parking_session` ADD FOREIGN KEY (`exit_gate_id`) REFERENCES `gate` (`gate_id`);
ALTER TABLE `payment` ADD FOREIGN KEY (`session_id`) REFERENCES `parking_session` (`session_id`);
ALTER TABLE `payment` ADD FOREIGN KEY (`booking_id`) REFERENCES `booking` (`booking_id`);
ALTER TABLE `payment` ADD FOREIGN KEY (`policy_id`) REFERENCES `pricing_policy` (`policy_id`);
ALTER TABLE `pricing_policy` ADD FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_type` (`vehicle_type_id`);
ALTER TABLE `gate_log` ADD FOREIGN KEY (`gate_id`) REFERENCES `gate` (`gate_id`);
ALTER TABLE `gate_log` ADD FOREIGN KEY (`session_id`) REFERENCES `parking_session` (`session_id`);
ALTER TABLE `gate_log` ADD FOREIGN KEY (`staff_user_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `ocr_scan` ADD FOREIGN KEY (`session_id`) REFERENCES `parking_session` (`session_id`);
ALTER TABLE `ocr_scan` ADD FOREIGN KEY (`gate_id`) REFERENCES `gate` (`gate_id`);
ALTER TABLE `ocr_scan` ADD FOREIGN KEY (`corrected_by_user_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `request` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `request` ADD FOREIGN KEY (`assigned_staff_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `exception_case` ADD FOREIGN KEY (`session_id`) REFERENCES `parking_session` (`session_id`);
ALTER TABLE `exception_case` ADD FOREIGN KEY (`request_id`) REFERENCES `request` (`request_id`);
ALTER TABLE `exception_case` ADD FOREIGN KEY (`resolved_by`) REFERENCES `users` (`user_id`);
ALTER TABLE `notification` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `activity_log` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `staff_shift` ADD FOREIGN KEY (`staff_user_id`) REFERENCES `users` (`user_id`);
ALTER TABLE `staff_shift` ADD FOREIGN KEY (`shift_id`) REFERENCES `shift` (`shift_id`);
ALTER TABLE `system_config` ADD FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`);

-- ============================================================
-- SEED DATA
-- ============================================================

-- 1. Roles
INSERT INTO `role` (`role_name`) VALUES
('ADMIN'), ('MANAGER'), ('STAFF'), ('DRIVER');

-- 2. Vehicle Types (chỉ 2 loại: MOTORBIKE + CAR)
INSERT INTO `vehicle_type`
(`name`, `description`, `slot_size`, `hourly_rate`, `daily_rate`, `is_active`, `created_at`, `updated_at`) VALUES
('MOTORBIKE', 'Xe máy', 'SMALL',  5000.00,  50000.00, true, NOW(), NOW()),
('CAR',       'Ô tô',   'LARGE', 15000.00, 150000.00, true, NOW(), NOW());

-- 3. Users — password: Password123!
INSERT INTO `users` (`username`, `full_name`, `email`, `phone`, `password_hash`, `status`, `created_at`, `updated_at`) VALUES
('admin',   'Admin System',    'admin@parking.com',   '0900000001', '$2b$10$WcFoS6UScbX1UQLiZzKDvuJ16Lhdn/wFTodpjeUmUFm3dOjBgoWBa', 'ACTIVE', NOW(), NOW()),
('manager', 'Nguyen Manager',  'manager@parking.com', '0900000002', '$2b$10$WcFoS6UScbX1UQLiZzKDvuJ16Lhdn/wFTodpjeUmUFm3dOjBgoWBa', 'ACTIVE', NOW(), NOW()),
('staff1',  'Tran Staff One',  'staff1@parking.com',  '0900000003', '$2b$10$WcFoS6UScbX1UQLiZzKDvuJ16Lhdn/wFTodpjeUmUFm3dOjBgoWBa', 'ACTIVE', NOW(), NOW()),
('driver1', 'Le Driver One',   'driver1@parking.com', '0900000004', '$2b$10$WcFoS6UScbX1UQLiZzKDvuJ16Lhdn/wFTodpjeUmUFm3dOjBgoWBa', 'ACTIVE', NOW(), NOW()),
('driver2', 'Pham Driver Two', 'driver2@parking.com', '0900000005', '$2b$10$WcFoS6UScbX1UQLiZzKDvuJ16Lhdn/wFTodpjeUmUFm3dOjBgoWBa', 'ACTIVE', NOW(), NOW());

-- 4. User Roles
INSERT INTO `user_role` (`user_id`, `role_id`) VALUES
(1, 1), (2, 2), (3, 3), (4, 4), (5, 4);

-- 5. Parking Building
INSERT INTO `parking_building`
(`name`, `address`, `phone`, `email`, `description`, `open_time`, `close_time`, `is_active`, `created_at`, `updated_at`) VALUES
('Bãi xe FPT HCM',
 'Lô E2a-7, Đường D1, Long Thạnh Mỹ, TP.HCM',
 '0900000010',
 'parking@fpt.edu.vn',
 'Bãi đỗ xe trong khuôn viên FPT HCM',
 '06:00:00',
 '22:00:00',
 true, NOW(), NOW());

-- 5b. Assign staff to building
UPDATE `users` SET `assigned_building_id` = 1 WHERE `username` = 'staff1';

-- 6. Floors: Tầng 1 = Xe máy (36 slots), Tầng 2 = Ô tô (36 slots)
INSERT INTO `floor`
(`building_id`, `floor_number`, `floor_name`, `capacity`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'Tầng 1 - Xe máy', 36, true, NOW(), NOW()),
(1, 2, 'Tầng 2 - Ô tô',  36, true, NOW(), NOW());

-- 7. Zones: 6 zones/tầng
-- Tầng 1 (floor_id=1): 6 zones cho MOTORBIKE (vehicle_type_id=1)
-- Tầng 2 (floor_id=2): 6 zones cho CAR (vehicle_type_id=2)
INSERT INTO `zone`
(`floor_id`, `vehicle_type_id`, `zone_name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'T1-A', 'Khu A - Xe máy tầng 1', true, NOW(), NOW()),
(1, 1, 'T1-B', 'Khu B - Xe máy tầng 1', true, NOW(), NOW()),
(1, 1, 'T1-C', 'Khu C - Xe máy tầng 1', true, NOW(), NOW()),
(1, 1, 'T1-D', 'Khu D - Xe máy tầng 1', true, NOW(), NOW()),
(1, 1, 'T1-E', 'Khu E - Xe máy tầng 1', true, NOW(), NOW()),
(1, 1, 'T1-F', 'Khu F - Xe máy tầng 1', true, NOW(), NOW()),
(2, 2, 'T2-A', 'Khu A - Ô tô tầng 2',  true, NOW(), NOW()),
(2, 2, 'T2-B', 'Khu B - Ô tô tầng 2',  true, NOW(), NOW()),
(2, 2, 'T2-C', 'Khu C - Ô tô tầng 2',  true, NOW(), NOW()),
(2, 2, 'T2-D', 'Khu D - Ô tô tầng 2',  true, NOW(), NOW()),
(2, 2, 'T2-E', 'Khu E - Ô tô tầng 2',  true, NOW(), NOW()),
(2, 2, 'T2-F', 'Khu F - Ô tô tầng 2',  true, NOW(), NOW());

-- 8. Parking Slots: 6 slots/zone = 72 slots tổng
-- Tầng 1: zone 1-6, slot_size = SMALL (xe máy)
INSERT INTO `parking_slot`
(`zone_id`, `slot_code`, `slot_size`, `priority`, `distance_to_gate`, `status`, `is_active`, `created_at`, `updated_at`) VALUES
(1,'T1-A-01','SMALL',1,5,'AVAILABLE',true,NOW(),NOW()),(1,'T1-A-02','SMALL',2,10,'AVAILABLE',true,NOW(),NOW()),
(1,'T1-A-03','SMALL',3,15,'AVAILABLE',true,NOW(),NOW()),(1,'T1-A-04','SMALL',4,20,'AVAILABLE',true,NOW(),NOW()),
(1,'T1-A-05','SMALL',5,25,'AVAILABLE',true,NOW(),NOW()),(1,'T1-A-06','SMALL',6,30,'AVAILABLE',true,NOW(),NOW()),
(2,'T1-B-01','SMALL',1,5,'AVAILABLE',true,NOW(),NOW()),(2,'T1-B-02','SMALL',2,10,'AVAILABLE',true,NOW(),NOW()),
(2,'T1-B-03','SMALL',3,15,'AVAILABLE',true,NOW(),NOW()),(2,'T1-B-04','SMALL',4,20,'AVAILABLE',true,NOW(),NOW()),
(2,'T1-B-05','SMALL',5,25,'AVAILABLE',true,NOW(),NOW()),(2,'T1-B-06','SMALL',6,30,'AVAILABLE',true,NOW(),NOW()),
(3,'T1-C-01','SMALL',1,5,'AVAILABLE',true,NOW(),NOW()),(3,'T1-C-02','SMALL',2,10,'AVAILABLE',true,NOW(),NOW()),
(3,'T1-C-03','SMALL',3,15,'AVAILABLE',true,NOW(),NOW()),(3,'T1-C-04','SMALL',4,20,'AVAILABLE',true,NOW(),NOW()),
(3,'T1-C-05','SMALL',5,25,'AVAILABLE',true,NOW(),NOW()),(3,'T1-C-06','SMALL',6,30,'AVAILABLE',true,NOW(),NOW()),
(4,'T1-D-01','SMALL',1,5,'AVAILABLE',true,NOW(),NOW()),(4,'T1-D-02','SMALL',2,10,'AVAILABLE',true,NOW(),NOW()),
(4,'T1-D-03','SMALL',3,15,'AVAILABLE',true,NOW(),NOW()),(4,'T1-D-04','SMALL',4,20,'AVAILABLE',true,NOW(),NOW()),
(4,'T1-D-05','SMALL',5,25,'AVAILABLE',true,NOW(),NOW()),(4,'T1-D-06','SMALL',6,30,'AVAILABLE',true,NOW(),NOW()),
(5,'T1-E-01','SMALL',1,5,'AVAILABLE',true,NOW(),NOW()),(5,'T1-E-02','SMALL',2,10,'AVAILABLE',true,NOW(),NOW()),
(5,'T1-E-03','SMALL',3,15,'AVAILABLE',true,NOW(),NOW()),(5,'T1-E-04','SMALL',4,20,'AVAILABLE',true,NOW(),NOW()),
(5,'T1-E-05','SMALL',5,25,'AVAILABLE',true,NOW(),NOW()),(5,'T1-E-06','SMALL',6,30,'AVAILABLE',true,NOW(),NOW()),
(6,'T1-F-01','SMALL',1,5,'AVAILABLE',true,NOW(),NOW()),(6,'T1-F-02','SMALL',2,10,'AVAILABLE',true,NOW(),NOW()),
(6,'T1-F-03','SMALL',3,15,'AVAILABLE',true,NOW(),NOW()),(6,'T1-F-04','SMALL',4,20,'AVAILABLE',true,NOW(),NOW()),
(6,'T1-F-05','SMALL',5,25,'AVAILABLE',true,NOW(),NOW()),(6,'T1-F-06','SMALL',6,30,'AVAILABLE',true,NOW(),NOW()),
-- Tầng 2: zone 7-12, slot_size = LARGE (ô tô)
(7,'T2-A-01','LARGE',1,5,'AVAILABLE',true,NOW(),NOW()),(7,'T2-A-02','LARGE',2,10,'AVAILABLE',true,NOW(),NOW()),
(7,'T2-A-03','LARGE',3,15,'AVAILABLE',true,NOW(),NOW()),(7,'T2-A-04','LARGE',4,20,'AVAILABLE',true,NOW(),NOW()),
(7,'T2-A-05','LARGE',5,25,'AVAILABLE',true,NOW(),NOW()),(7,'T2-A-06','LARGE',6,30,'AVAILABLE',true,NOW(),NOW()),
(8,'T2-B-01','LARGE',1,5,'AVAILABLE',true,NOW(),NOW()),(8,'T2-B-02','LARGE',2,10,'AVAILABLE',true,NOW(),NOW()),
(8,'T2-B-03','LARGE',3,15,'AVAILABLE',true,NOW(),NOW()),(8,'T2-B-04','LARGE',4,20,'AVAILABLE',true,NOW(),NOW()),
(8,'T2-B-05','LARGE',5,25,'AVAILABLE',true,NOW(),NOW()),(8,'T2-B-06','LARGE',6,30,'AVAILABLE',true,NOW(),NOW()),
(9,'T2-C-01','LARGE',1,5,'AVAILABLE',true,NOW(),NOW()),(9,'T2-C-02','LARGE',2,10,'AVAILABLE',true,NOW(),NOW()),
(9,'T2-C-03','LARGE',3,15,'AVAILABLE',true,NOW(),NOW()),(9,'T2-C-04','LARGE',4,20,'AVAILABLE',true,NOW(),NOW()),
(9,'T2-C-05','LARGE',5,25,'AVAILABLE',true,NOW(),NOW()),(9,'T2-C-06','LARGE',6,30,'AVAILABLE',true,NOW(),NOW()),
(10,'T2-D-01','LARGE',1,5,'AVAILABLE',true,NOW(),NOW()),(10,'T2-D-02','LARGE',2,10,'AVAILABLE',true,NOW(),NOW()),
(10,'T2-D-03','LARGE',3,15,'AVAILABLE',true,NOW(),NOW()),(10,'T2-D-04','LARGE',4,20,'AVAILABLE',true,NOW(),NOW()),
(10,'T2-D-05','LARGE',5,25,'AVAILABLE',true,NOW(),NOW()),(10,'T2-D-06','LARGE',6,30,'AVAILABLE',true,NOW(),NOW()),
(11,'T2-E-01','LARGE',1,5,'AVAILABLE',true,NOW(),NOW()),(11,'T2-E-02','LARGE',2,10,'AVAILABLE',true,NOW(),NOW()),
(11,'T2-E-03','LARGE',3,15,'AVAILABLE',true,NOW(),NOW()),(11,'T2-E-04','LARGE',4,20,'AVAILABLE',true,NOW(),NOW()),
(11,'T2-E-05','LARGE',5,25,'AVAILABLE',true,NOW(),NOW()),(11,'T2-E-06','LARGE',6,30,'AVAILABLE',true,NOW(),NOW()),
(12,'T2-F-01','LARGE',1,5,'AVAILABLE',true,NOW(),NOW()),(12,'T2-F-02','LARGE',2,10,'AVAILABLE',true,NOW(),NOW()),
(12,'T2-F-03','LARGE',3,15,'AVAILABLE',true,NOW(),NOW()),(12,'T2-F-04','LARGE',4,20,'AVAILABLE',true,NOW(),NOW()),
(12,'T2-F-05','LARGE',5,25,'AVAILABLE',true,NOW(),NOW()),(12,'T2-F-06','LARGE',6,30,'AVAILABLE',true,NOW(),NOW());

-- 9. Gates
INSERT INTO `gate`
(`building_id`, `gate_code`, `gate_type`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'GATE-A', 'ENTRY', true, NOW(), NOW()),
(1, 'GATE-B', 'EXIT',  true, NOW(), NOW()),
(1, 'GATE-C', 'BOTH',  true, NOW(), NOW());

-- 10. Pricing Policy (chỉ 2 loại xe)
INSERT INTO `pricing_policy`
(`vehicle_type_id`, `time_type`, `day_type`, `start_hour`, `end_hour`, `price_per_hour`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'NORMAL', 'WEEKDAY',  6, 22,  5000.00, true, NOW(), NOW()),
(1, 'NORMAL', 'WEEKEND',  6, 22,  7000.00, true, NOW(), NOW()),
(1, 'NIGHT',  'WEEKDAY', 22,  6,  3000.00, true, NOW(), NOW()),
(2, 'NORMAL', 'WEEKDAY',  6, 22, 15000.00, true, NOW(), NOW()),
(2, 'NORMAL', 'WEEKEND',  6, 22, 20000.00, true, NOW(), NOW()),
(2, 'NIGHT',  'WEEKDAY', 22,  6, 10000.00, true, NOW(), NOW());

-- 11. Vehicles (driver1: 1 moto + 1 car, driver2: 1 moto)
INSERT INTO `vehicle`
(`owner_user_id`, `vehicle_type_id`, `license_plate`, `brand`, `model`, `color`, `is_active`, `created_at`, `updated_at`) VALUES
(4, 1, '59F1-12345', 'Honda',  'Vision', 'Black', true, NOW(), NOW()),
(4, 2, '51A-99999',  'Toyota', 'Vios',   'White', true, NOW(), NOW()),
(5, 1, '59G2-67890', 'Yamaha', 'Janus',  'Blue',  true, NOW(), NOW());

-- 12. Shifts
INSERT INTO `shift` (`shift_name`, `start_time`, `end_time`, `status`) VALUES
('Ca sáng',  '06:00:00', '14:00:00', 'ACTIVE'),
('Ca chiều', '14:00:00', '22:00:00', 'ACTIVE'),
('Ca đêm',   '22:00:00', '06:00:00', 'ACTIVE');

-- 13. System Config
INSERT INTO `system_config` (`config_key`, `config_value`, `description`, `updated_at`) VALUES
('BOOKING_MIN_ADVANCE_MINUTES', '10', 'Tối thiểu N phút trước mới được booking (BR-03a)', NOW()),
('BOOKING_EXPIRE_AFTER_START',  '30', 'Booking hết hạn sau N phút từ booking_start_time (BR-03c)', NOW()),
('QR_EXPIRE_BUFFER_MINUTES',    '15', 'QR hết hạn sau N phút nếu xa hơn start_time (BR-03b)', NOW());

-- ============================================================
-- DONE — Accounts:
-- admin   / Password123! → ADMIN
-- manager / Password123! → MANAGER
-- staff1  / Password123! → STAFF  → assigned to Building 1
-- driver1 / Password123! → DRIVER
-- driver2 / Password123! → DRIVER
--
-- Cấu trúc bãi xe:
-- Tầng 1 (Xe máy): 6 zone (T1-A → T1-F), mỗi zone 6 slot = 36 slots SMALL
-- Tầng 2 (Ô tô):  6 zone (T2-A → T2-F), mỗi zone 6 slot = 36 slots LARGE
-- Tổng: 72 slots
--
-- Staff building assignment:
-- staff1 → Building 1 (Bãi xe FPT HCM)
-- Manager gán building cho staff qua: PUT /users/{id}/assign-building?buildingId=X
-- ============================================================
