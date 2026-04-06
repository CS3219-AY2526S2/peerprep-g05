-- 007_drop_otp_attempt_count.sql
-- Remove the unused attempt_count column from otp_codes.

ALTER TABLE otp_codes
    DROP COLUMN IF EXISTS attempt_count;
