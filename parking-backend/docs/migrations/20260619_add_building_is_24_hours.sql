-- One-time migration for existing databases.
-- Adds configurable 24/7 operation for each parking building.
ALTER TABLE parking_building
ADD is_24_hours BIT NOT NULL DEFAULT 0;
