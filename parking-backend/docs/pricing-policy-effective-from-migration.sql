-- Them versioning cho pricing_policy: moi lan Manager sua gia se tao 1 dong moi
-- voi effective_from = thoi diem sua, thay vi ghi de len dong cu. Dong cu duoc giu
-- lai (is_active=false) de tinh dung phi lich su cho cac phien do da/dang dien ra
-- truoc thoi diem sua gia.
--
-- Chay 1 lan tren moi database truoc khi deploy code co doi FeeCalculatorUtil /
-- PricingPolicy / PricingPolicyServiceImpl.

ALTER TABLE pricing_policy ADD COLUMN effective_from DATETIME NULL AFTER price_per_hour;
UPDATE pricing_policy SET effective_from = COALESCE(created_at, NOW());
ALTER TABLE pricing_policy MODIFY COLUMN effective_from DATETIME NOT NULL;
