import crypto from "crypto";
import userRepository from "../../infrastructure/database/repositories/userRepository.js";
import otpRepository from "../../infrastructure/database/repositories/otpRepository.js";
import { hashPassword, comparePassword } from "../../infrastructure/security/password.js";
import { signToken, verifyToken } from "../../infrastructure/security/jwt.js";
import { sendOtpEmail } from "../../infrastructure/email/client.js";
import User from "../models/User.js";
import config from "../../config/index.js";

function generateOtp() {
    // crypto.randomInt is cryptographically secure
    return crypto.randomInt(100000, 999999).toString();
}

function otpExpiresAt() {
    const d = new Date();
    d.setMinutes(d.getMinutes() + config.otp.expiryMinutes);
    return d;
}

const authService = {

    /**
     * Register a new user with "soft registration" where is_active = false until OTP is verified.
     * @returns {{ userId: string, message: string }}
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
            displayName: displayName || username,
            isActive: false,
        });

        const user = new User(row);
        const otp = generateOtp();

        await otpRepository.create({
            userId: user.id,
            code: otp,
            purpose: "REGISTRATION",
            expiresAt: otpExpiresAt(),
        });

        let emailDelivered = true;
        try {
            await sendOtpEmail({ to: user.email, otp });
        } catch (emailErr) {
            console.error("[authService] Failed to send OTP email:", emailErr.message);
            emailDelivered = false;
        }

        return {
            userId: user.id,
            message: emailDelivered
                ? `A verification code has been sent to ${user.email}. It expires in ${config.otp.expiryMinutes} minutes.`
                : `Account created but we could not send the verification email. Please use resend-otp to try again.`,
        };
    },

    /**
     * Verify an OTP to complete registration. Issues JWT on success.
     * @returns {{ user: User, accessToken: string }}
     */
    async verifyOtp({ userId, code }) {
        const record = await otpRepository.findValid(userId, "REGISTRATION");

        if (!record || record.code !== code) {
            const err = new Error("Invalid or expired verification code");
            err.status = 400;
            throw err;
        }

        await otpRepository.markUsed(record.id);
        await userRepository.updateStatus(userId, true);

        const row = await userRepository.findById(userId);
        const user = new User(row);
        const accessToken = signToken({ sub: user.id, role: user.role });

        return { user, accessToken };
    },

    /**
     * Resend a fresh OTP to a pending (unverified) user.
     */
    async resendOtp({ userId }) {
        const row = await userRepository.findById(userId);
        if (!row) {
            const err = new Error("User not found");
            err.status = 404;
            throw err;
        }
        if (row.is_active) {
            const err = new Error("Account is already verified");
            err.status = 409;
            throw err;
        }

        // Invalidate any previous unused codes before issuing a new one
        await otpRepository.invalidateAll(userId, "REGISTRATION");

        const otp = generateOtp();
        await otpRepository.create({
            userId,
            code: otp,
            purpose: "REGISTRATION",
            expiresAt: otpExpiresAt(),
        });

        let emailDelivered = true;
        try {
            await sendOtpEmail({ to: row.email, otp });
        } catch (emailErr) {
            console.error("[authService] Failed to resend OTP email:", emailErr.message);
            emailDelivered = false;
        }

        return {
            message: emailDelivered
                ? `A new verification code has been sent to ${row.email}.`
                : `Could not send the verification email. Please try again shortly.`,
        };
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
