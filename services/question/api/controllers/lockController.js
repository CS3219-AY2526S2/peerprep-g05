import { pool } from "../../infrastructure/postgres/client.js";

export async function acquireLock(req, res, next) {
    try {
        const { id } = req.params;
        const { locked_by } = req.body;

        if (!locked_by) {
            return res.status(400).json({ success: false, error: "locked_by is required" });
        }

        // Check the question exists
        const question = await pool.query("SELECT id FROM questions WHERE id = $1", [id]);
        if (question.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Question not found" });
        }

        // Atomic lock acquire / refresh for same holder.
        // If another user holds the lock, this returns no rows.
        const upsert = await pool.query(
            `INSERT INTO question_locks (question_id, locked_by)
             VALUES ($1, $2)
             ON CONFLICT (question_id)
             DO UPDATE SET locked_at = CURRENT_TIMESTAMP
             WHERE question_locks.locked_by = EXCLUDED.locked_by
             RETURNING *`,
            [id, locked_by]
        );

        if (upsert.rows.length > 0) {
            return res.json({ success: true, data: upsert.rows[0] });
        }

        const existing = await pool.query(
            "SELECT * FROM question_locks WHERE question_id = $1",
            [id]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: `Question is currently being edited by ${existing.rows[0].locked_by}`,
                data: existing.rows[0],
            });
        }

        // Fallback for rare edge cases (e.g., lock was released between queries).
        return res.status(409).json({
            success: false,
            error: "Could not acquire lock. Please retry.",
        });
    } catch (error) {
        next(error);
    }
}

// Unlock
export async function releaseLock(req, res, next) {
    try {
        const { id } = req.params;
        const { locked_by } = req.body;

        if (!locked_by) {
            return res.status(400).json({ success: false, error: "locked_by is required" });
        }

        const existing = await pool.query("SELECT * FROM question_locks WHERE question_id = $1", [id]);

        if (existing.rows.length === 0) {
            return res.json({ success: true, message: "No lock exists" });
        }

        if (existing.rows[0].locked_by !== locked_by) {
            return res.status(403).json({
                success: false,
                error: "You do not hold the lock on this question",
            });
        }

        await pool.query("DELETE FROM question_locks WHERE question_id = $1", [id]);
        res.json({ success: true, message: "Lock released" });
    } catch (error) {
        next(error);
    }
}

// Check Lock
export async function getLockStatus(req, res, next) {
    try {
        const { id } = req.params;

        const result = await pool.query("SELECT * FROM question_locks WHERE question_id = $1", [id]);

        if (result.rows.length === 0) {
            return res.json({ success: true, data: null });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
}
