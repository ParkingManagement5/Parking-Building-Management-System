-- ============================================================
--  Parking Building Management System - MySQL Schema
--  Generated from ERD.md
--  Database: parking_db
--  Charset: utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS parking_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE parking_db;

-- ─── 1. INDEPENDENT TABLES (no FK) ──────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_type (
    vehicle_type_id INT          PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(50)  NOT NULL UNIQUE,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role (
    role_id   INT         PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS shift (
    shift_id   INT         PRIMARY KEY AUTO_INCREMENT,
    shift_name VARCHAR(50) NOT NULL,
    start_time TIME        NOT NULL,
    end_time   TIME        NOT NULL,
    status     VARCHAR(20) DEFAULT 'ACTIVE'
    -- ACTIVE | INACTIVE
);

-- ─── 2. CORE USER & BUILDING ─────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    user_id       INT          PRIMARY KEY AUTO_INCREMENT,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    phone         VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    -- ACTIVE | INACTIVE | LOCKED
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parking_building (
    building_id     INT          PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(100) NOT NULL,
    address         VARCHAR(255) NOT NULL,
    operating_hours VARCHAR(50),
    total_floors    INT,
    status          VARCHAR(20)  DEFAULT 'ACTIVE',
    -- ACTIVE | INACTIVE | MAINTENANCE
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── 3. USER RELATIONS ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_role (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users (user_id),
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES role (role_id)
);

CREATE TABLE IF NOT EXISTS password_reset_token (
    token_id   INT          PRIMARY KEY AUTO_INCREMENT,
    user_id    INT          NOT NULL,
    token      VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME     NOT NULL,
    used       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users (user_id)
);

CREATE TABLE IF NOT EXISTS activity_log (
    log_id      BIGINT       PRIMARY KEY AUTO_INCREMENT,
    user_id     INT,
    action_type VARCHAR(50),
    action      VARCHAR(200) NOT NULL,
    ip_address  VARCHAR(50),
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES users (user_id)
);

-- ─── 4. PARKING STRUCTURE ────────────────────────────────────

CREATE TABLE IF NOT EXISTS floor (
    floor_id     INT         PRIMARY KEY AUTO_INCREMENT,
    building_id  INT         NOT NULL,
    floor_number INT         NOT NULL,
    floor_name   VARCHAR(50),
    status       VARCHAR(20) DEFAULT 'ACTIVE',
    -- ACTIVE | INACTIVE | MAINTENANCE
    created_at   DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_fl_building FOREIGN KEY (building_id) REFERENCES parking_building (building_id)
);

CREATE TABLE IF NOT EXISTS gate (
    gate_id     INT         PRIMARY KEY AUTO_INCREMENT,
    building_id INT         NOT NULL,
    gate_code   VARCHAR(50) NOT NULL UNIQUE,
    gate_type   VARCHAR(20) NOT NULL,
    -- ENTRY | EXIT | BOTH
    created_at  DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_gate_building FOREIGN KEY (building_id) REFERENCES parking_building (building_id)
);

CREATE TABLE IF NOT EXISTS zone (
    zone_id         INT         PRIMARY KEY AUTO_INCREMENT,
    floor_id        INT         NOT NULL,
    vehicle_type_id INT         NOT NULL,
    zone_name       VARCHAR(50) NOT NULL,
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    created_at      DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_zone_floor    FOREIGN KEY (floor_id)        REFERENCES floor        (floor_id),
    CONSTRAINT fk_zone_vtype    FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_type (vehicle_type_id)
);

CREATE TABLE IF NOT EXISTS parking_slot (
    slot_id          INT         PRIMARY KEY AUTO_INCREMENT,
    zone_id          INT         NOT NULL,
    slot_code        VARCHAR(20) NOT NULL UNIQUE,
    priority         INT,
    distance_to_gate INT,
    status           VARCHAR(20) DEFAULT 'AVAILABLE',
    -- AVAILABLE | RESERVED | OCCUPIED | MAINTENANCE
    created_at       DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_slot_zone FOREIGN KEY (zone_id) REFERENCES zone (zone_id)
);

-- ─── 5. VEHICLE ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle (
    vehicle_id      INT         PRIMARY KEY AUTO_INCREMENT,
    owner_user_id   INT         NOT NULL,
    vehicle_type_id INT         NOT NULL,
    license_plate   VARCHAR(20) NOT NULL UNIQUE,
    created_at      DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_veh_user  FOREIGN KEY (owner_user_id)   REFERENCES users        (user_id),
    CONSTRAINT fk_veh_vtype FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_type (vehicle_type_id)
);

-- ─── 6. BOOKING & SESSION ────────────────────────────────────

CREATE TABLE IF NOT EXISTS booking (
    booking_id          INT         PRIMARY KEY AUTO_INCREMENT,
    user_id             INT         NOT NULL,
    vehicle_id          INT         NOT NULL,
    slot_id             INT         NOT NULL,
    booking_start_time  DATETIME,
    booking_end_time    DATETIME,
    reserved_at         DATETIME,
    expired_at          DATETIME,
    status              VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',
    -- PENDING_PAYMENT | CONFIRMED | CHECKED_IN | EXPIRED | CANCELLED | COMPLETED
    created_at          DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bk_user    FOREIGN KEY (user_id)    REFERENCES users        (user_id),
    CONSTRAINT fk_bk_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle      (vehicle_id),
    CONSTRAINT fk_bk_slot    FOREIGN KEY (slot_id)    REFERENCES parking_slot (slot_id)
);

CREATE TABLE IF NOT EXISTS parking_session (
    session_id   INT         PRIMARY KEY AUTO_INCREMENT,
    booking_id   INT,
    slot_id      INT         NOT NULL,
    user_id      INT         NOT NULL,
    vehicle_id   INT         NOT NULL,
    entry_gate_id INT,
    exit_gate_id  INT,
    entry_time   DATETIME,
    exit_time    DATETIME,
    entry_mode   VARCHAR(20) DEFAULT 'WALK_IN_AUTO',
    -- BOOKING | WALK_IN_AUTO | WALK_IN_MANUAL
    status       VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    -- ACTIVE | WAITING_PAYMENT | COMPLETED | EXCEPTION
    created_at   DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ps_booking    FOREIGN KEY (booking_id)    REFERENCES booking      (booking_id),
    CONSTRAINT fk_ps_slot       FOREIGN KEY (slot_id)       REFERENCES parking_slot (slot_id),
    CONSTRAINT fk_ps_user       FOREIGN KEY (user_id)       REFERENCES users        (user_id),
    CONSTRAINT fk_ps_vehicle    FOREIGN KEY (vehicle_id)    REFERENCES vehicle      (vehicle_id),
    CONSTRAINT fk_ps_entry_gate FOREIGN KEY (entry_gate_id) REFERENCES gate         (gate_id),
    CONSTRAINT fk_ps_exit_gate  FOREIGN KEY (exit_gate_id)  REFERENCES gate         (gate_id)
);

-- ─── 7. TICKET, GATE LOG, OCR ────────────────────────────────

CREATE TABLE IF NOT EXISTS ticket (
    ticket_id   INT         PRIMARY KEY AUTO_INCREMENT,
    session_id  INT         NOT NULL,
    ticket_code VARCHAR(50) NOT NULL UNIQUE,
    ticket_type VARCHAR(20) DEFAULT 'WALK_IN',
    -- BOOKING | WALK_IN
    issued_at   DATETIME    NOT NULL,
    status      VARCHAR(20) DEFAULT 'ACTIVE',
    -- ACTIVE | LOST | CLOSED
    created_at  DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tk_session FOREIGN KEY (session_id) REFERENCES parking_session (session_id)
);

CREATE TABLE IF NOT EXISTS gate_log (
    gate_log_id   INT         PRIMARY KEY AUTO_INCREMENT,
    gate_id       INT         NOT NULL,
    session_id    INT,
    staff_user_id INT,
    license_plate VARCHAR(20),
    event_type    VARCHAR(30) NOT NULL,
    -- ENTRY | EXIT
    result_status VARCHAR(20) DEFAULT 'SUCCESS',
    -- SUCCESS | FAILED | MANUAL_CHECK
    event_time    DATETIME    NOT NULL,
    created_at    DATETIME    DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_gl_gate    FOREIGN KEY (gate_id)       REFERENCES gate             (gate_id),
    CONSTRAINT fk_gl_session FOREIGN KEY (session_id)    REFERENCES parking_session  (session_id),
    CONSTRAINT fk_gl_staff   FOREIGN KEY (staff_user_id) REFERENCES users            (user_id)
);

CREATE TABLE IF NOT EXISTS ocr_scan (
    scan_id                 INT          PRIMARY KEY AUTO_INCREMENT,
    session_id              INT,
    gate_id                 INT,
    image_path              VARCHAR(500),
    detected_plate          VARCHAR(20),
    plate_confidence_score  FLOAT,
    corrected_plate         VARCHAR(20),
    staff_vehicle_type_id   INT,
    is_corrected            BOOLEAN      NOT NULL DEFAULT FALSE,
    corrected_by            INT,
    corrected_at            DATETIME,
    correction_reason       VARCHAR(255),
    trigger_type            VARCHAR(20),
    -- ENTRY | EXIT
    process_status          VARCHAR(30)  DEFAULT 'AUTO_APPROVED',
    -- AUTO_APPROVED | MANUAL_REVIEW | STAFF_APPROVED | CORRECTED_AFTER_APPROVAL | FAILED
    scanned_at              DATETIME,
    CONSTRAINT fk_ocr_session FOREIGN KEY (session_id)            REFERENCES parking_session (session_id),
    CONSTRAINT fk_ocr_gate    FOREIGN KEY (gate_id)               REFERENCES gate            (gate_id),
    CONSTRAINT fk_ocr_vtype   FOREIGN KEY (staff_vehicle_type_id) REFERENCES vehicle_type   (vehicle_type_id),
    CONSTRAINT fk_ocr_staff   FOREIGN KEY (corrected_by)          REFERENCES users          (user_id)
);

-- ─── 8. PRICING & PAYMENT ────────────────────────────────────

CREATE TABLE IF NOT EXISTS pricing_policy (
    policy_id       INT            PRIMARY KEY AUTO_INCREMENT,
    vehicle_type_id INT            NOT NULL,
    time_type       VARCHAR(20)    NOT NULL,
    -- HOURLY | DAILY | OVERNIGHT
    day_type        VARCHAR(20)    NOT NULL,
    -- WEEKDAY | WEEKEND | HOLIDAY
    start_hour      INT,
    end_hour        INT,
    price_per_hour  DECIMAL(10,2)  NOT NULL,
    is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pp_vtype FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_type (vehicle_type_id)
);

CREATE TABLE IF NOT EXISTS payment (
    payment_id      INT            PRIMARY KEY AUTO_INCREMENT,
    session_id      INT            NOT NULL,
    policy_id       INT,
    applied_rate    DECIMAL(10,2),
    base_fee        DECIMAL(12,2),
    overtime_fee    DECIMAL(12,2),
    penalty_fee     DECIMAL(12,2),
    discount        DECIMAL(12,2),
    total_amount    DECIMAL(12,2)  NOT NULL,
    transaction_ref VARCHAR(100)   UNIQUE,
    payment_method  VARCHAR(20)    DEFAULT 'CASH',
    -- CASH | MOCK | VNPAY
    payment_status  VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    -- PENDING | PAID | FAILED | REFUNDED | CANCELLED
    paid_at         DATETIME,
    created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pay_session FOREIGN KEY (session_id) REFERENCES parking_session (session_id),
    CONSTRAINT fk_pay_policy  FOREIGN KEY (policy_id)  REFERENCES pricing_policy  (policy_id)
);

-- ─── 9. REQUEST & EXCEPTION ──────────────────────────────────

CREATE TABLE IF NOT EXISTS request (
    request_id        INT          PRIMARY KEY AUTO_INCREMENT,
    user_id           INT          NOT NULL,
    assigned_staff_id INT,
    request_type      VARCHAR(30),
    -- LOST_CARD | WRONG_FEE | CANNOT_FIND_CAR | OTHER
    subject           VARCHAR(200),
    description       TEXT,
    status            VARCHAR(20)  DEFAULT 'PENDING',
    -- PENDING | PROCESSING | RESOLVED | REJECTED | CLOSED
    resolved_at       DATETIME,
    created_at        DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_req_user  FOREIGN KEY (user_id)           REFERENCES users (user_id),
    CONSTRAINT fk_req_staff FOREIGN KEY (assigned_staff_id) REFERENCES users (user_id)
);

CREATE TABLE IF NOT EXISTS exception_case (
    exception_id   INT          PRIMARY KEY AUTO_INCREMENT,
    session_id     INT,
    request_id     INT,
    exception_type VARCHAR(30),
    description    VARCHAR(500),
    status         VARCHAR(20)  DEFAULT 'OPEN',
    -- OPEN | PROCESSING | RESOLVED | CLOSED
    resolved_by    INT,
    resolved_at    DATETIME,
    created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_exc_session FOREIGN KEY (session_id) REFERENCES parking_session (session_id),
    CONSTRAINT fk_exc_request FOREIGN KEY (request_id) REFERENCES request         (request_id),
    CONSTRAINT fk_exc_staff   FOREIGN KEY (resolved_by) REFERENCES users          (user_id)
);

-- ─── 10. NOTIFICATION, STAFF SHIFT, SYSTEM CONFIG ────────────

CREATE TABLE IF NOT EXISTS notification (
    notification_id INT          PRIMARY KEY AUTO_INCREMENT,
    user_id         INT          NOT NULL,
    title           VARCHAR(200) NOT NULL,
    body            TEXT,
    type            VARCHAR(50),
    entity_type     VARCHAR(30),
    entity_id       INT,
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (user_id)
);

CREATE TABLE IF NOT EXISTS staff_shift (
    staff_shift_id INT  PRIMARY KEY AUTO_INCREMENT,
    staff_user_id  INT  NOT NULL,
    shift_id       INT  NOT NULL,
    working_date   DATE NOT NULL,
    CONSTRAINT fk_ss_user  FOREIGN KEY (staff_user_id) REFERENCES users (user_id),
    CONSTRAINT fk_ss_shift FOREIGN KEY (shift_id)      REFERENCES shift (shift_id)
);

CREATE TABLE IF NOT EXISTS system_config (
    config_id    BIGINT       PRIMARY KEY AUTO_INCREMENT,
    config_key   VARCHAR(100) NOT NULL UNIQUE,
    config_value VARCHAR(255),
    description  VARCHAR(255),
    updated_by   INT,
    updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sc_user FOREIGN KEY (updated_by) REFERENCES users (user_id)
);

-- ─── 11. SEED DATA ───────────────────────────────────────────

INSERT IGNORE INTO vehicle_type (name) VALUES ('MOTORBIKE'), ('CAR'), ('ELECTRIC_CAR');

INSERT IGNORE INTO role (role_name) VALUES ('ADMIN'), ('MANAGER'), ('STAFF'), ('DRIVER');
