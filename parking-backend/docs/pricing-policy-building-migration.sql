-- Cho phep pricing_policy gan voi 1 toa nha cu the (per-building pricing).
-- building_id NULL = gia mac dinh (global default) ap dung cho toa nha nao
-- chua tu cau hinh gia rieng. Cac dong hien co giu nguyen building_id = NULL
-- nen khong pha du lieu/gia dang ap dung.
--
-- Chay 1 lan tren moi database truoc khi deploy code co doi PricingPolicy /
-- PricingPolicyServiceImpl / FeeCalculatorUtil callers.

ALTER TABLE pricing_policy
    ADD COLUMN building_id INT NULL AFTER vehicle_type_id,
    ADD CONSTRAINT fk_pricing_policy_building
        FOREIGN KEY (building_id) REFERENCES parking_building(building_id);
