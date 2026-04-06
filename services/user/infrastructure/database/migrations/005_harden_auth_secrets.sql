-- 005_harden_auth_secrets.sql
-- Hash one-time secrets, track failed attempts, and support access-token revocation after password reset.

ALTER TABLE otp_codes
    ALTER COLUMN code DROP NOT NULL;

ALTER TABLE otp_codes
    ADD COLUMN IF NOT EXISTS code_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_otp_code_hash_purpose ON otp_codes(code_hash, purpose);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS token_valid_after TIMESTAMPTZ;
