import userRepository from "../../infrastructure/database/repositories/userRepository.js";
import User from "../models/User.js";

const VALID_ROLES = ["USER", "ADMIN"];

const userService = {
    async getProfile(userId) {
        const row = await userRepository.findById(userId);
        if (!row) {
            const err = new Error("User not found");
            err.status = 404;
            throw err;
        }
        return new User(row);
    },

    /**
     * Update own profile (safe fields only).
     * The `role` field is explicitly stripped to prevent privilege escalation.
     */
    async updateProfile(userId, fields) {
        const dbFields = {};
        if (fields.displayName !== undefined) dbFields.display_name = fields.displayName;
        if (fields.email !== undefined) dbFields.email = fields.email;
        if (fields.username !== undefined) dbFields.username = fields.username;

        if (Object.keys(dbFields).length === 0) {
            const err = new Error("No valid fields to update");
            err.status = 400;
            throw err;
        }

        // Check uniqueness if email or username is being changed
        if (dbFields.email) {
            const existing = await userRepository.findByEmail(dbFields.email);
            if (existing && existing.id !== userId) {
                const err = new Error("Email already in use");
                err.status = 409;
                throw err;
            }
        }
        if (dbFields.username) {
            const existing = await userRepository.findByUsername(dbFields.username);
            if (existing && existing.id !== userId) {
                const err = new Error("Username already taken");
                err.status = 409;
                throw err;
            }
        }

        const row = await userRepository.updateProfile(userId, dbFields);
        if (!row) {
            const err = new Error("User not found");
            err.status = 404;
            throw err;
        }
        return new User(row);
    },

    // For admins

    async listAllUsers() {
        const rows = await userRepository.findAll();
        return rows.map((r) => new User(r));
    },

    async updateUserRole(targetUserId, role) {
        if (!VALID_ROLES.includes(role)) {
            const err = new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`);
            err.status = 400;
            throw err;
        }

        const row = await userRepository.updateRole(targetUserId, role);
        if (!row) {
            const err = new Error("User not found");
            err.status = 404;
            throw err;
        }
        return new User(row);
    },

    async updateUserStatus(targetUserId, isActive) {
        if (typeof isActive !== "boolean") {
            const err = new Error("is_active must be a boolean");
            err.status = 400;
            throw err;
        }

        const row = await userRepository.updateStatus(targetUserId, isActive);
        if (!row) {
            const err = new Error("User not found");
            err.status = 404;
            throw err;
        }
        return new User(row);
    },
};

export default userService;
