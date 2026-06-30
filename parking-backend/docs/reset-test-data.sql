-- ============================================================
-- RESET TEST DATA — xóa transactional data, giữ nguyên config
-- Chạy trong MySQL Workbench trên database parking_db
-- ============================================================

USE parking_db;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Xóa toàn bộ data transactional
DELETE FROM `payment`;
DELETE FROM `gate_log`;
DELETE FROM `ocr_scan`;
DELETE FROM `parking_session`;
DELETE FROM `booking`;

-- 2. Reset tất cả slots về AVAILABLE
UPDATE `parking_slot` SET `status` = 'AVAILABLE', `updated_at` = NOW();

-- 3. Reset auto_increment
ALTER TABLE `payment`        AUTO_INCREMENT = 1;
ALTER TABLE `gate_log`       AUTO_INCREMENT = 1;
ALTER TABLE `ocr_scan`       AUTO_INCREMENT = 1;
ALTER TABLE `parking_session` AUTO_INCREMENT = 1;
ALTER TABLE `booking`        AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- 4. Thêm xe CAR cho tài khoản pu123 (nếu chưa có)
INSERT IGNORE INTO `vehicle`
  (`owner_user_id`, `vehicle_type_id`, `license_plate`, `brand`, `model`, `color`, `is_active`, `created_at`, `updated_at`)
SELECT
  u.user_id,
  (SELECT vehicle_type_id FROM vehicle_type WHERE name = 'CAR' LIMIT 1),
  '51A-TEST01',
  'Toyota', 'Camry', 'Black',
  true, NOW(), NOW()
FROM `users` u
WHERE u.username = 'pu123'
  AND NOT EXISTS (
    SELECT 1 FROM `vehicle` v2 WHERE v2.license_plate = '51A-TEST01'
  );

-- 5. Kiểm tra kết quả
SELECT 'parking_slot AVAILABLE' AS check_name, COUNT(*) AS count FROM parking_slot WHERE status = 'AVAILABLE'
UNION ALL
SELECT 'booking còn lại', COUNT(*) FROM booking
UNION ALL
SELECT 'parking_session còn lại', COUNT(*) FROM parking_session
UNION ALL
SELECT 'payment còn lại', COUNT(*) FROM payment;

SELECT v.license_plate, vt.name AS vehicle_type, u.username
FROM vehicle v
JOIN vehicle_type vt ON v.vehicle_type_id = vt.vehicle_type_id
JOIN users u ON v.owner_user_id = u.user_id
WHERE u.username = 'pu123';
