-- Them booking_type (HOURLY/DAILY/WEEKLY/MONTHLY) vao booking de driver chon
-- hinh thuc gui xe khi dat cho. Booking dai han (DAILY/WEEKLY/MONTHLY) duoc tinh
-- phi flat-rate theo PricingPolicy.time_type thay vi cong don theo block gio nhu
-- HOURLY (xem FeeCalculatorUtil.calculateSessionFee overload 5 tham so).
--
-- Chay 1 lan tren moi database truoc khi pull code co doi Booking /
-- BookingServiceImpl / FeeCalculatorUtil. An toan chay nhieu lan: tu bo qua
-- neu cot da ton tai (khong bi loi "Duplicate column" neu ai do lo chay lai).
--
-- Neu DB dang co san PricingPolicy voi time_type cu ("NORMAL"/"NIGHT" v.v.),
-- can doi lai thanh "HOURLY" de bang gia hien dung tren trang dat cho:
--   UPDATE pricing_policy SET time_type = 'HOURLY' WHERE time_type NOT IN ('HOURLY','DAILY','WEEKLY','MONTHLY');

SET @db = DATABASE();

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'booking' AND COLUMN_NAME = 'booking_type') = 0,
  'ALTER TABLE booking ADD COLUMN booking_type VARCHAR(20) NOT NULL DEFAULT ''HOURLY'' AFTER booking_end_time',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
