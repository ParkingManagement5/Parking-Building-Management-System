CREATE TABLE `parking_building` (
                                    `building_id` int PRIMARY KEY AUTO_INCREMENT,
                                    `name` varchar(100) NOT NULL,
                                    `address` varchar(255) NOT NULL,
                                    `operating_hours` varchar(50),
                                    `total_floors` int,
                                    `status` varchar(20) NOT NULL,
                                    `created_at` datetime,
                                    `updated_at` datetime
);

CREATE TABLE `floor` (
                         `floor_id` int PRIMARY KEY AUTO_INCREMENT,
                         `building_id` int NOT NULL,
                         `floor_number` int NOT NULL,
                         `floor_name` varchar(50),
                         `status` varchar(20) NOT NULL,
                         `created_at` datetime,
                         `updated_at` datetime
);

CREATE TABLE `vehicle_type` (
                                `vehicle_type_id` int PRIMARY KEY AUTO_INCREMENT,
                                `name` varchar(50) UNIQUE NOT NULL,
                                `created_at` datetime,
                                `updated_at` datetime
);

CREATE TABLE `zone` (
                        `zone_id` int PRIMARY KEY AUTO_INCREMENT,
                        `floor_id` int NOT NULL,
                        `vehicle_type_id` int NOT NULL,
                        `zone_name` varchar(50) NOT NULL,
                        `status` varchar(20) NOT NULL,
                        `created_at` datetime,
                        `updated_at` datetime
);

CREATE TABLE `parking_slot` (
                                `slot_id` int PRIMARY KEY AUTO_INCREMENT,
                                `zone_id` int NOT NULL,
                                `slot_code` varchar(20) UNIQUE NOT NULL,
                                `priority` int,
                                `distance_to_gate` int,
                                `status` varchar(20) NOT NULL,
                                `created_at` datetime,
                                `updated_at` datetime
);

CREATE TABLE `gate` (
                        `gate_id` int PRIMARY KEY AUTO_INCREMENT,
                        `building_id` int NOT NULL,
                        `gate_code` varchar(50) UNIQUE NOT NULL,
                        `gate_type` varchar(20) NOT NULL,
                        `created_at` datetime,
                        `updated_at` datetime
);

CREATE TABLE `users` (
                         `user_id` int PRIMARY KEY AUTO_INCREMENT,
                         `username` varchar(50) UNIQUE NOT NULL,
                         `full_name` varchar(100) NOT NULL,
                         `email` varchar(100) UNIQUE NOT NULL,
                         `phone` varchar(20),
                         `password_hash` varchar(255) NOT NULL,
                         `status` varchar(20) NOT NULL,
                         `created_at` datetime,
                         `updated_at` datetime
);

CREATE TABLE `role` (
                        `role_id` int PRIMARY KEY AUTO_INCREMENT,
                        `role_name` varchar(50) UNIQUE NOT NULL
);

CREATE TABLE `user_role` (
                             `user_id` int NOT NULL,
                             `role_id` int NOT NULL,
                             PRIMARY KEY (`user_id`, `role_id`)
);

CREATE TABLE `password_reset_token` (
                                        `token_id` int PRIMARY KEY AUTO_INCREMENT,
                                        `user_id` int NOT NULL,
                                        `token` varchar(255) UNIQUE NOT NULL,
                                        `expires_at` datetime NOT NULL,
                                        `used` boolean NOT NULL DEFAULT false,
                                        `created_at` datetime
);

CREATE TABLE `vehicle` (
                           `vehicle_id` int PRIMARY KEY AUTO_INCREMENT,
                           `owner_user_id` int NOT NULL,
                           `vehicle_type_id` int NOT NULL,
                           `license_plate` varchar(20) UNIQUE NOT NULL,
                           `created_at` datetime,
                           `updated_at` datetime
);

CREATE TABLE `booking` (
                           `booking_id` int PRIMARY KEY AUTO_INCREMENT,
                           `user_id` int NOT NULL,
                           `vehicle_id` int NOT NULL,
                           `slot_id` int NOT NULL,
                           `booking_start_time` datetime,
                           `booking_end_time` datetime,
                           `reserved_at` datetime,
                           `expired_at` datetime,
                           `qr_token` varchar(500) UNIQUE,
                           `qr_issued_at` datetime,
                           `qr_used_at` datetime,
                           `deposit_amount` decimal(10,2) DEFAULT 0,
                           `deposit_paid_at` datetime,
                           `status` varchar(30) NOT NULL,
                           `created_at` datetime,
                           `updated_at` datetime
);

CREATE TABLE `parking_session` (
                                   `session_id` int PRIMARY KEY AUTO_INCREMENT,
                                   `booking_id` int,
                                   `slot_id` int NOT NULL,
                                   `user_id` int NOT NULL,
                                   `vehicle_id` int NOT NULL,
                                   `entry_gate_id` int,
                                   `exit_gate_id` int,
                                   `entry_time` datetime,
                                   `exit_time` datetime,
                                   `entry_mode` varchar(20) NOT NULL,
                                   `status` varchar(30) NOT NULL,
                                   `created_at` datetime,
                                   `updated_at` datetime
);

CREATE TABLE `payment` (
                           `payment_id` int PRIMARY KEY AUTO_INCREMENT,
                           `session_id` int,
                           `booking_id` int,
                           `policy_id` int,
                           `payment_type` varchar(20) NOT NULL,
                           `applied_rate` decimal(10,2),
                           `base_fee` decimal(12,2),
                           `overtime_fee` decimal(12,2),
                           `penalty_fee` decimal(12,2),
                           `discount` decimal(12,2),
                           `deposit_deducted` decimal(12,2),
                           `total_amount` decimal(12,2) NOT NULL,
                           `transaction_ref` varchar(100) UNIQUE,
                           `payment_method` varchar(20) NOT NULL,
                           `payment_status` varchar(20) NOT NULL,
                           `paid_at` datetime,
                           `created_at` datetime,
                           `updated_at` datetime
);

CREATE TABLE `pricing_policy` (
                                  `policy_id` int PRIMARY KEY AUTO_INCREMENT,
                                  `vehicle_type_id` int NOT NULL,
                                  `time_type` varchar(20) NOT NULL,
                                  `day_type` varchar(20) NOT NULL,
                                  `start_hour` int,
                                  `end_hour` int,
                                  `price_per_hour` decimal(10,2) NOT NULL,
                                  `is_active` boolean NOT NULL DEFAULT true,
                                  `created_at` datetime,
                                  `updated_at` datetime
);

CREATE TABLE `gate_log` (
                            `gate_log_id` int PRIMARY KEY AUTO_INCREMENT,
                            `gate_id` int NOT NULL,
                            `session_id` int,
                            `staff_user_id` int,
                            `license_plate` varchar(20),
                            `event_type` varchar(30) NOT NULL,
                            `result_status` varchar(20) NOT NULL,
                            `event_time` datetime NOT NULL,
                            `created_at` datetime,
                            `updated_at` datetime
);

CREATE TABLE `ocr_scan` (
                            `scan_id` int PRIMARY KEY AUTO_INCREMENT,
                            `session_id` int,
                            `gate_id` int,
                            `image_path` varchar(500),
                            `detected_plate` varchar(20),
                            `plate_confidence_score` float,
                            `corrected_plate` varchar(20),
                            `staff_vehicle_type_id` int,
                            `is_corrected` boolean NOT NULL DEFAULT false,
                            `corrected_by` int,
                            `corrected_at` datetime,
                            `correction_reason` varchar(255),
                            `trigger_type` varchar(20) NOT NULL,
                            `process_status` varchar(30) NOT NULL,
                            `scanned_at` datetime
);

CREATE TABLE `request` (
                           `request_id` int PRIMARY KEY AUTO_INCREMENT,
                           `user_id` int NOT NULL,
                           `assigned_staff_id` int,
                           `request_type` varchar(30) NOT NULL,
                           `subject` varchar(200),
                           `description` text,
                           `status` varchar(20) NOT NULL,
                           `resolved_at` datetime,
                           `created_at` datetime,
                           `updated_at` datetime
);

CREATE TABLE `exception_case` (
                                  `exception_id` int PRIMARY KEY AUTO_INCREMENT,
                                  `session_id` int,
                                  `request_id` int,
                                  `exception_type` varchar(30) NOT NULL,
                                  `description` varchar(500),
                                  `status` varchar(20) NOT NULL,
                                  `resolved_by` int,
                                  `resolved_at` datetime,
                                  `created_at` datetime,
                                  `updated_at` datetime
);

CREATE TABLE `notification` (
                                `notification_id` int PRIMARY KEY AUTO_INCREMENT,
                                `user_id` int NOT NULL,
                                `title` varchar(200) NOT NULL,
                                `body` text,
                                `type` varchar(50),
                                `entity_type` varchar(30),
                                `entity_id` int,
                                `is_read` boolean NOT NULL DEFAULT false,
                                `created_at` datetime
);

CREATE TABLE `activity_log` (
                                `log_id` bigint PRIMARY KEY AUTO_INCREMENT,
                                `user_id` int,
                                `action_type` varchar(50),
                                `action` varchar(200) NOT NULL,
                                `ip_address` varchar(50),
                                `created_at` datetime
);

CREATE TABLE `shift` (
                         `shift_id` int PRIMARY KEY AUTO_INCREMENT,
                         `shift_name` varchar(50) NOT NULL,
                         `start_time` time NOT NULL,
                         `end_time` time NOT NULL,
                         `status` varchar(20) NOT NULL
);

CREATE TABLE `staff_shift` (
                               `staff_shift_id` int PRIMARY KEY AUTO_INCREMENT,
                               `staff_user_id` int NOT NULL,
                               `shift_id` int NOT NULL,
                               `working_date` date NOT NULL
);

CREATE TABLE `system_config` (
                                 `config_id` bigint PRIMARY KEY AUTO_INCREMENT,
                                 `config_key` varchar(100) UNIQUE NOT NULL,
                                 `config_value` varchar(255),
                                 `description` varchar(255),
                                 `updated_by` int,
                                 `updated_at` datetime
);

ALTER TABLE `floor` ADD FOREIGN KEY (`building_id`) REFERENCES `parking_building` (`building_id`);

ALTER TABLE `zone` ADD FOREIGN KEY (`floor_id`) REFERENCES `floor` (`floor_id`);

ALTER TABLE `zone` ADD FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_type` (`vehicle_type_id`);

ALTER TABLE `parking_slot` ADD FOREIGN KEY (`zone_id`) REFERENCES `zone` (`zone_id`);

ALTER TABLE `gate` ADD FOREIGN KEY (`building_id`) REFERENCES `parking_building` (`building_id`);

ALTER TABLE `user_role` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

ALTER TABLE `user_role` ADD FOREIGN KEY (`role_id`) REFERENCES `role` (`role_id`);

ALTER TABLE `password_reset_token` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

ALTER TABLE `vehicle` ADD FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`user_id`);

ALTER TABLE `vehicle` ADD FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_type` (`vehicle_type_id`);

ALTER TABLE `booking` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

ALTER TABLE `booking` ADD FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle` (`vehicle_id`);

ALTER TABLE `booking` ADD FOREIGN KEY (`slot_id`) REFERENCES `parking_slot` (`slot_id`);

ALTER TABLE `parking_session` ADD FOREIGN KEY (`booking_id`) REFERENCES `booking` (`booking_id`);

ALTER TABLE `parking_session` ADD FOREIGN KEY (`slot_id`) REFERENCES `parking_slot` (`slot_id`);

ALTER TABLE `parking_session` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

ALTER TABLE `parking_session` ADD FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle` (`vehicle_id`);

ALTER TABLE `parking_session` ADD FOREIGN KEY (`entry_gate_id`) REFERENCES `gate` (`gate_id`);

ALTER TABLE `parking_session` ADD FOREIGN KEY (`exit_gate_id`) REFERENCES `gate` (`gate_id`);

ALTER TABLE `payment` ADD FOREIGN KEY (`session_id`) REFERENCES `parking_session` (`session_id`);

ALTER TABLE `payment` ADD FOREIGN KEY (`booking_id`) REFERENCES `booking` (`booking_id`);

ALTER TABLE `payment` ADD FOREIGN KEY (`policy_id`) REFERENCES `pricing_policy` (`policy_id`);

ALTER TABLE `pricing_policy` ADD FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_type` (`vehicle_type_id`);

ALTER TABLE `gate_log` ADD FOREIGN KEY (`gate_id`) REFERENCES `gate` (`gate_id`);

ALTER TABLE `gate_log` ADD FOREIGN KEY (`session_id`) REFERENCES `parking_session` (`session_id`);

ALTER TABLE `gate_log` ADD FOREIGN KEY (`staff_user_id`) REFERENCES `users` (`user_id`);

ALTER TABLE `ocr_scan` ADD FOREIGN KEY (`session_id`) REFERENCES `parking_session` (`session_id`);

ALTER TABLE `ocr_scan` ADD FOREIGN KEY (`gate_id`) REFERENCES `gate` (`gate_id`);

ALTER TABLE `ocr_scan` ADD FOREIGN KEY (`staff_vehicle_type_id`) REFERENCES `vehicle_type` (`vehicle_type_id`);

ALTER TABLE `ocr_scan` ADD FOREIGN KEY (`corrected_by`) REFERENCES `users` (`user_id`);

ALTER TABLE `request` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

ALTER TABLE `request` ADD FOREIGN KEY (`assigned_staff_id`) REFERENCES `users` (`user_id`);

ALTER TABLE `exception_case` ADD FOREIGN KEY (`session_id`) REFERENCES `parking_session` (`session_id`);

ALTER TABLE `exception_case` ADD FOREIGN KEY (`request_id`) REFERENCES `request` (`request_id`);

ALTER TABLE `exception_case` ADD FOREIGN KEY (`resolved_by`) REFERENCES `users` (`user_id`);

ALTER TABLE `notification` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

ALTER TABLE `activity_log` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

ALTER TABLE `staff_shift` ADD FOREIGN KEY (`staff_user_id`) REFERENCES `users` (`user_id`);

ALTER TABLE `staff_shift` ADD FOREIGN KEY (`shift_id`) REFERENCES `shift` (`shift_id`);

ALTER TABLE `system_config` ADD FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`);
