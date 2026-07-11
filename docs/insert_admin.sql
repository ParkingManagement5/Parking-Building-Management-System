USE parking_db;

-- Tạo user admin test (password: admin123)
INSERT IGNORE INTO users (username, full_name, email, phone, password_hash, status)
VALUES ('admin', 'Admin Test', 'admin@parking.com', '0900000000',
        '$2b$10$EJPJhIMJeWEm2No7qEseZ.Ruw8tFCNNPRE0xZ5dqpJUfvqe7ZRIKy', 'ACTIVE');

-- Gán role ADMIN
INSERT IGNORE INTO user_role (user_id, role_id)
SELECT u.user_id, r.role_id
FROM users u, role r
WHERE u.username = 'admin' AND r.role_name = 'ADMIN';

-- Kiểm tra lại
SELECT u.username, r.role_name
FROM users u
JOIN user_role ur ON u.user_id = ur.user_id
JOIN role r ON ur.role_id = r.role_id
WHERE u.username = 'admin';
