-- Them booking_type (HOURLY/DAILY/WEEKLY/MONTHLY) vao booking de driver chon
-- hinh thuc gui xe khi dat cho. Booking dai han (DAILY/WEEKLY/MONTHLY) duoc tinh
-- phi flat-rate theo PricingPolicy.time_type thay vi cong don theo block gio nhu
-- HOURLY (xem FeeCalculatorUtil.calculateSessionFee overload 5 tham so).
--
-- Chay 1 lan tren moi database truoc khi deploy code co doi Booking /
-- BookingServiceImpl / FeeCalculatorUtil.

ALTER TABLE booking ADD COLUMN booking_type VARCHAR(20) NOT NULL DEFAULT 'HOURLY' AFTER booking_end_time;
