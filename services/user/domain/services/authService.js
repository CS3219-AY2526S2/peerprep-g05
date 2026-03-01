import userRepository from "../../infrastructure/database/repositories/userRepository.js";
import { hashPassword, comparePassword } from "../../infrastructure/security/password.js";
import { signToken, verifyToken } from "../../infrastructure/security/jwt.js";
import User from "../models/User.js";

const authService = {

    /**
     * Register a new user.
     * @returns {{ user: User, accessToken: string }}
     */
    async register({ email, username, password, displayName }) {
        const existingEmail = await userRepository.findByEmail(email);
        if (existingEmail) {
            const err = new Error("Email already in use");
            err.status = 409;
            throw err;
        }

        const existingUsername = await userRepository.findByUsername(username);
        if (existingUsername) {
            const err = new Error("Username already taken");
            err.status = 409;
            throw err;
        }

        const passwordHash = await hashPassword(password);

        const row = await userRepository.create({
            email,
            username,
            passwordHash,
            role: "USER",
            displayName: displayName || null,
        });

        const user = new User(row);
        const accessToken = signToken({ sub: user.id, role: user.role });

        return { user, accessToken };
    },

    /**
     * Authenticate a user by email/username + password.
     * @returns {{ user: User, accessToken: string }}
     */
    async login({ identifier, password }) {
        const row = await userRepository.findByEmailOrUsername(identifier);

        if (!row) {
            const err = new Error("Invalid credentials");
            err.status = 401;
            throw err;
        }

        if (!row.is_active) {
            const err = new Error("Account is deactivated");
            err.status = 403;
            throw err;
        }

        const passwordValid = await comparePassword(password, row.password_hash);
        if (!passwordValid) {
            const err = new Error("Invalid credentials");
            err.status = 401;
            throw err;
        }

        const user = new User(row);
        const accessToken = signToken({ sub: user.id, role: user.role });

        return { user, accessToken };
    },

    /**
     * Validate a token and return the principal info.
     * Used by other services for token introspection.
     */
    async introspect(token) {
        try {
            const decoded = verifyToken(token);

            const row = await userRepository.findById(decoded.sub);
            if (!row || !row.is_active) {
                return { active: false };
            }

            return {
                active: true,
                userId: decoded.sub,
                role: decoded.role,
                exp: decoded.exp,
            };
        } catch {
            return { active: false };
        }
    },
};

export default authService;
