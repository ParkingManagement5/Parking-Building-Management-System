-- ============================================================
-- SEED: Bảng giá theo hình thức đặt chỗ dài hạn
-- DAILY / WEEKLY / MONTHLY cho xe máy và ô tô
-- Chạy 1 lần sau khi đã có booking-type-migration.sql
-- ============================================================

USE parking_db;

-- Xoá dữ liệu cũ (nếu có) để tránh trùng
DELETE FROM pricing_policy WHERE time_type IN ('DAILY', 'WEEKLY', 'MONTHLY');

INSERT INTO pricing_policy
  (vehicle_type_id, time_type, day_type, start_hour, end_hour, price_per_hour, effective_from, is_active, created_at, updated_at)
VALUES
  -- ─── Xe máy (vehicle_type_id = 1) ───────────────────────
  -- Theo ngày
  (1, 'DAILY',   'WEEKDAY', NULL, NULL,   50000.00, '2025-01-01 00:00:00', true, NOW(), NOW()),
  (1, 'DAILY',   'WEEKEND', NULL, NULL,   60000.00, '2025-01-01 00:00:00', true, NOW(), NOW()),
  -- Theo tuần (giá trọn gói 7 ngày)
  (1, 'WEEKLY',  'WEEKDAY', NULL, NULL,  300000.00, '2025-01-01 00:00:00', true, NOW(), NOW()),
  -- Theo tháng (giá trọn gói 30 ngày)
  (1, 'MONTHLY', 'WEEKDAY', NULL, NULL, 1000000.00, '2025-01-01 00:00:00', true, NOW(), NOW()),

  -- ─── Ô tô (vehicle_type_id = 2) ─────────────────────────
  -- Theo ngày
  (2, 'DAILY',   'WEEKDAY', NULL, NULL,  100000.00, '2025-01-01 00:00:00', true, NOW(), NOW()),
  (2, 'DAILY',   'WEEKEND', NULL, NULL,  120000.00, '2025-01-01 00:00:00', true, NOW(), NOW()),
  -- Theo tuần
  (2, 'WEEKLY',  'WEEKDAY', NULL, NULL,  600000.00, '2025-01-01 00:00:00', true, NOW(), NOW()),
  -- Theo tháng
  (2, 'MONTHLY', 'WEEKDAY', NULL, NULL, 2000000.00, '2025-01-01 00:00:00', true, NOW(), NOW());

-- Kiểm tra
SELECT
  vt.name AS loai_xe,
  pp.time_type AS hinh_thuc,
  pp.day_type AS loai_ngay,
  FORMAT(pp.price_per_hour, 0) AS gia_vnd,
  pp.is_active
FROM pricing_policy pp
JOIN vehicle_type vt ON pp.vehicle_type_id = vt.vehicle_type_id
WHERE pp.time_type IN ('DAILY','WEEKLY','MONTHLY')
ORDER BY vt.vehicle_type_id, pp.time_type, pp.day_type;
