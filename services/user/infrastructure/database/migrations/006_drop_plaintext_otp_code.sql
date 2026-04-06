-- 006_drop_plaintext_otp_code.sql
-- Remove the legacy plaintext otp_codes.code column once all compatibility fallback is gone.

ALTER TABLE otp_codes
    DROP COLUMN IF EXISTS code;
