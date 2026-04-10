import { postgres } from "../client.js";

/**
 * Data-access layer for the otp_codes table.
 */
const otpRepository = {

    /**
     * Insert a new OTP record.
     */
    async create({ userId, codeHash, purpose, expiresAt }) {
        const { rows } = await postgres.query(
            `INSERT INTO otp_codes (user_id, code_hash, purpose, expires_at)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [userId, codeHash, purpose, expiresAt],
        );
        return rows[0];
    },

    /**
     * Find the most recent unused, unexpired OTP for a user + purpose.
     */
    async findValid(userId, purpose) {
        const { rows } = await postgres.query(
            `SELECT * FROM otp_codes
             WHERE user_id = $1
               AND purpose = $2
               AND used_at IS NULL
               AND expires_at > NOW()
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId, purpose],
        );
        return rows[0] || null;
    },

    /**
     * Find a valid unused, unexpired OTP by record id + purpose.
     * Used for selector-based password reset tokens.
     */
    async findValidById(id, purpose) {
        const { rows } = await postgres.query(
            `SELECT * FROM otp_codes
             WHERE id = $1
               AND purpose = $2
               AND used_at IS NULL
               AND expires_at > NOW()
             LIMIT 1`,
            [id, purpose],
        );
        return rows[0] || null;
    },

    /**
     * Mark an OTP as used so it cannot be replayed.
     */
    async markUsed(id) {
        await postgres.query(
            "UPDATE otp_codes SET used_at = NOW() WHERE id = $1",
            [id],
        );
    },

    /**
     * Find a valid unused, unexpired OTP by its code value and purpose.
     * Used for password reset where we only have the token from the URL, not the userId.
     */
    async findValidByToken({ codeHash, purpose }) {
        const { rows } = await postgres.query(
            `SELECT * FROM otp_codes
             WHERE purpose = $1
               AND used_at IS NULL
               AND expires_at > NOW()
               AND code_hash = $2
             ORDER BY created_at DESC
             LIMIT 1`,
            [purpose, codeHash],
        );
        return rows[0] || null;
    },

    /**
     * Invalidate all unused OTPs for a user + purpose (used before issuing a fresh one).
     */
    async invalidateAll(userId, purpose) {
        await postgres.query(
            `UPDATE otp_codes
             SET used_at = NOW()
             WHERE user_id = $1
               AND purpose = $2
               AND used_at IS NULL`,
            [userId, purpose],
        );
    },
};

export default otpRepository;
