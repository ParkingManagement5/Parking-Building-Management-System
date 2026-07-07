-- Migration: add columns required by testing branch entities
-- Run once on each database before deploying testing branch code.
--
-- 1. request.building_id   — links a request to the building it belongs to
-- 2. exception_case.booking_id — links an exception to a specific booking

-- 1. request table
ALTER TABLE `request`
    ADD COLUMN `building_id` int DEFAULT NULL AFTER `assigned_staff_id`;

-- 2. exception_case table
ALTER TABLE `exception_case`
    ADD COLUMN `booking_id` int DEFAULT NULL AFTER `request_id`;
