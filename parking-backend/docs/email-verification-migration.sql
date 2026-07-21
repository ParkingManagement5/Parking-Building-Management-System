-- Migration: email verification + password reset OTP (MySQL 8.0)
-- Chạy trên DB đã có sẵn bảng users (không cần nếu chạy parking_db_schema.sql từ đầu)
-- An toàn chạy nhiều lần: bỏ qua nếu cột đã tồn tại

SET @db = 'parking_db';

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verification_code') = 0,
  'ALTER TABLE users ADD COLUMN email_verification_code VARCHAR(10) NULL, ADD COLUMN email_verification_expires_at DATETIME NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_reset_otp') = 0,
  'ALTER TABLE users ADD COLUMN password_reset_otp VARCHAR(10) NULL, ADD COLUMN password_reset_otp_expires_at DATETIME NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
