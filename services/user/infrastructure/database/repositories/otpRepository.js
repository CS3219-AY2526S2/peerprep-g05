import { postgres } from "../client.js";

/**
 * Data-access layer for the otp_codes table.
 */
const otpRepository = {

    /**
     * Insert a new OTP record.
     */
    async create({ userId, code, purpose, expiresAt }) {
        const { rows } = await postgres.query(
            `INSERT INTO otp_codes (user_id, code, purpose, expires_at)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [userId, code, purpose, expiresAt],
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
     * Mark an OTP as used so it cannot be replayed.
     */
    async markUsed(id) {
        await postgres.query(
            "UPDATE otp_codes SET used_at = NOW() WHERE id = $1",
            [id],
        );
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
