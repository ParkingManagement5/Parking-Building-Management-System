ALTER TABLE users
  ADD COLUMN email_verification_code VARCHAR(10) NULL,
  ADD COLUMN email_verification_expires_at DATETIME NULL;
