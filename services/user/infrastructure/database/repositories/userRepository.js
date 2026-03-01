import { postgres } from "../client.js";

/**
 * Data-access layer for the users table.
 * Every method returns plain row objects (or arrays of them).
 */
const userRepository = {

    async findById(id) {
        const { rows } = await postgres.query(
            "SELECT * FROM users WHERE id = $1",
            [id],
        );
        return rows[0] || null;
    },

    async findByEmail(email) {
        const { rows } = await postgres.query(
            "SELECT * FROM users WHERE email = $1",
            [email.toLowerCase()],
        );
        return rows[0] || null;
    },

    async findByUsername(username) {
        const { rows } = await postgres.query(
            "SELECT * FROM users WHERE username = $1",
            [username.toLowerCase()],
        );
        return rows[0] || null;
    },

    async findByEmailOrUsername(identifier) {
        const lower = identifier.toLowerCase();
        const { rows } = await postgres.query(
            "SELECT * FROM users WHERE email = $1 OR username = $1",
            [lower],
        );
        return rows[0] || null;
    },

    async create({ email, username, passwordHash, role = "USER", displayName = null }) {
        const { rows } = await postgres.query(
            `INSERT INTO users (email, username, password_hash, role, display_name)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [email.toLowerCase(), username.toLowerCase(), passwordHash, role, displayName],
        );
        return rows[0];
    },

    async updateProfile(id, fields) {
        const allowed = ["display_name", "email", "username"];
        const setClauses = [];
        const values = [];
        let idx = 1;

        for (const [key, value] of Object.entries(fields)) {
            if (allowed.includes(key) && value !== undefined) {
                setClauses.push(`${key} = $${idx}`);
                values.push(key === "email" || key === "username" ? value.toLowerCase() : value);
                idx++;
            }
        }

        if (setClauses.length === 0) return this.findById(id);

        values.push(id);
        const { rows } = await postgres.query(
            `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
            values,
        );
        return rows[0] || null;
    },

    async findAll() {
        const { rows } = await postgres.query(
            "SELECT id, email, username, role, display_name, is_active, created_at, updated_at FROM users ORDER BY created_at DESC",
        );
        return rows;
    },

    async updateRole(id, role) {
        const { rows } = await postgres.query(
            "UPDATE users SET role = $1 WHERE id = $2 RETURNING *",
            [role, id],
        );
        return rows[0] || null;
    },

    async updateStatus(id, isActive) {
        const { rows } = await postgres.query(
            "UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *",
            [isActive, id],
        );
        return rows[0] || null;
    },

    /**
     * Hard-delete a user from the database.
     * ONLY use for edge cases like erasure requests or cleaning up test data.
     * Prefer soft-delete (updateStatus with isActive=false) for normal operations.
     */
    async deleteUser(id) {
        const { rows } = await postgres.query(
            "DELETE FROM users WHERE id = $1 RETURNING id",
            [id],
        );
        return rows[0] || null;
    },
};

export default userRepository;
