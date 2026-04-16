import userRepository from "../../infrastructure/database/repositories/userRepository.js";
import User from "../models/User.js";
import { API_ASSIGNABLE_ROLES, ROLES } from "../models/roles.js";

function makeError(message, status) {
    const err = new Error(message);
    err.status = status;
    return err;
}

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

    async updateUserRole(actor, targetUserId, role) {
        if (!API_ASSIGNABLE_ROLES.includes(role)) {
            throw makeError(`Invalid role. Must be one of: ${API_ASSIGNABLE_ROLES.join(", ")}`, 400);
        }

        const target = await userRepository.findById(targetUserId);
        if (!target) {
            throw makeError("User not found", 404);
        }

        if (target.role === role) {
            return new User(target);
        }

        if (target.role === ROLES.MASTER_ADMIN) {
            throw makeError("MASTER_ADMIN accounts cannot be modified via this endpoint", 403);
        }

        if (actor.role === ROLES.ADMIN) {
            if (!(target.role === ROLES.USER && role === ROLES.ADMIN)) {
                throw makeError("Only MASTER_ADMIN can demote admins or modify privileged accounts", 403);
            }
        }

        if (actor.role === ROLES.MASTER_ADMIN && actor.id === targetUserId) {
            throw makeError("MASTER_ADMIN cannot change their own role", 403);
        }

        const row = await userRepository.updateRole(targetUserId, role);
        return new User(row);
    },

    async updateUserStatus(actor, targetUserId, isActive) {
        if (typeof isActive !== "boolean") {
            throw makeError("is_active must be a boolean", 400);
        }

        const target = await userRepository.findById(targetUserId);
        if (!target) {
            throw makeError("User not found", 404);
        }

        if (target.role === ROLES.MASTER_ADMIN) {
            throw makeError("MASTER_ADMIN accounts cannot be deactivated", 403);
        }

        if (target.is_active === isActive) {
            return new User(target);
        }

        if (actor.role === ROLES.ADMIN && target.role !== ROLES.USER) {
            throw makeError("Only MASTER_ADMIN can change the status of admin accounts", 403);
        }

        const row = await userRepository.updateStatus(targetUserId, isActive);
        return new User(row);
    },
};

export default userService;
