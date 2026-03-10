-- 002_create_otp_codes_table.sql
-- Stores one-time codes for registration verification and password reset.
-- Reused by both flows via the `purpose` column.

CREATE TYPE otp_purpose AS ENUM ('REGISTRATION', 'PASSWORD_RESET');

CREATE TABLE IF NOT EXISTS otp_codes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code        VARCHAR(6) NOT NULL,
    purpose     otp_purpose NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_user_purpose ON otp_codes(user_id, purpose);
