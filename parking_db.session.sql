ALTER TABLE request
    ADD COLUMN building_id BIGINT,
    ADD CONSTRAINT fk_request_building
        FOREIGN KEY (building_id) REFERENCES parking_building(building_id);

ALTER TABLE pricing_policy
    ADD COLUMN effective_from DATETIME NOT NULL DEFAULT NOW();

ALTER TABLE exception_case
    ADD COLUMN booking_id INT;