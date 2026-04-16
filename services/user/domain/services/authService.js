import crypto from "crypto";
import userRepository from "../../infrastructure/database/repositories/userRepository.js";
import otpRepository from "../../infrastructure/database/repositories/otpRepository.js";
import { hashPassword, comparePassword } from "../../infrastructure/security/password.js";
import { isTokenFresh, signToken, verifyToken } from "../../infrastructure/security/jwt.js";
import { digestOneTimeSecret, matchesStoredOneTimeSecret } from "../../infrastructure/security/oneTimeSecret.js";
import { sendOtpEmail, sendPasswordResetEmail } from "../../infrastructure/email/client.js";
import User from "../models/User.js";
import { ROLES, toExternalRole } from "../models/roles.js";
import config from "../../config/index.js";

function generateOtp() {
    // crypto.randomInt is cryptographically secure
    return crypto.randomInt(100000, 1000000).toString();
}

function otpExpiresAt() {
    const d = new Date();
    d.setMinutes(d.getMinutes() + config.otp.expiryMinutes);
    return d;
}

function passwordResetExpiresAt() {
    const d = new Date();
    d.setMinutes(d.getMinutes() + config.passwordReset.expiryMinutes);
    return d;
}

function makeInvalidCodeError(message) {
    const err = new Error(message);
    err.status = 400;
    return err;
}

function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseSelectorToken(token) {
    const [selector, secret] = String(token).split(".", 2);
    if (!selector || !secret || !isUuid(selector)) {
        return null;
    }

    return {
        selector,
        secret,
    };
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
            role: ROLES.USER,
            displayName: displayName || username,
            isActive: false,
        });

        const user = new User(row);
        const otp = generateOtp();

        await otpRepository.create({
            userId: user.id,
            codeHash: digestOneTimeSecret(otp),
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

        if (!record) {
            throw makeInvalidCodeError("Invalid or expired verification code");
        }

        const validCode = matchesStoredOneTimeSecret({
            rawSecret: code,
            codeHash: record.code_hash,
        });

        if (!validCode) {
            throw makeInvalidCodeError("Invalid or expired verification code");
        }

        await otpRepository.markUsed(record.id);
        await userRepository.updateStatus(userId, true);

        const row = await userRepository.findById(userId);
        const user = new User(row);
        const accessToken = signToken({ sub: user.id, role: toExternalRole(user.role) });

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
            codeHash: digestOneTimeSecret(otp),
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
        const accessToken = signToken({ sub: user.id, role: toExternalRole(user.role) });

        return { user, accessToken };
    },

    /**
     * Initiate a password reset.
     * Looks up the user by email, requires the account to be fully verified (is_active = true).
     */
    async forgotPassword({ email }) {
        const genericResponse = {
            message: "If that email is registered and verified, a password reset link has been sent.",
        };

        const row = await userRepository.findByEmail(email);

        if (!row || !row.is_active) {
            return genericResponse;
        }

        await otpRepository.invalidateAll(row.id, "PASSWORD_RESET");

        const tokenSecret = crypto.randomBytes(32).toString("hex");
        const record = await otpRepository.create({
            userId: row.id,
            codeHash: digestOneTimeSecret(tokenSecret),
            purpose: "PASSWORD_RESET",
            expiresAt: passwordResetExpiresAt(),
        });
        const token = `${record.id}.${tokenSecret}`;

        const resetLink = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

        try {
            await sendPasswordResetEmail({
                to: row.email,
                resetLink,
                expiryMinutes: config.passwordReset.expiryMinutes,
            });
        } catch (emailErr) {
            console.error("[authService] Failed to send password reset email:", emailErr.message);
        }

        return genericResponse;
    },

    /**
     * Complete a password reset using the token from the reset link.
     * Validates the token, applies the new password, and invalidates the token.
     */
    async resetPassword({ token, password }) {
        const parsedToken = parseSelectorToken(token);
        let record = null;

        if (parsedToken) {
            record = await otpRepository.findValidById(parsedToken.selector, "PASSWORD_RESET");

            if (!record) {
                throw makeInvalidCodeError("Invalid or expired password reset link");
            }

            const validToken = matchesStoredOneTimeSecret({
                rawSecret: parsedToken.secret,
                codeHash: record.code_hash,
            });

            if (!validToken) {
                throw makeInvalidCodeError("Invalid or expired password reset link");
            }
        } else {
            record = await otpRepository.findValidByToken({
                codeHash: digestOneTimeSecret(token),
                purpose: "PASSWORD_RESET",
            });
        }

        if (!record) {
            throw makeInvalidCodeError("Invalid or expired password reset link");
        }

        const passwordHash = await hashPassword(password);
        await userRepository.updatePassword(record.user_id, passwordHash);
        await otpRepository.markUsed(record.id);
        await userRepository.updateTokenValidAfter(record.user_id, new Date());

        return { message: "Password has been reset successfully. You may now log in." };
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
            if (!isTokenFresh(decoded, row.token_valid_after)) {
                return { active: false };
            }

            return {
                active: true,
                userId: decoded.sub,
                role: toExternalRole(row.role),
                accountRole: row.role,
                exp: decoded.exp,
            };
        } catch {
            return { active: false };
        }
    },
};

export default authService;
