-- 003_alter_otp_codes_code_length.sql
-- Widen the code column from VARCHAR(6) to accommodate password reset tokens.
-- Registration OTPs are 6 digits.
-- Password reset tokens are 64 hex characters (crypto.randomBytes(32).toString('hex'): 32 bytes × 2 hex chars/byte).

ALTER TABLE otp_codes ALTER COLUMN code TYPE VARCHAR(64);