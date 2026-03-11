import authService from "../../domain/services/authService.js";
import { getPublicKey } from "../../infrastructure/security/jwt.js";
import config from "../../config/index.js";

/**
 * POST /auth/register
 * Creates a pending unverified account and sends an OTP email. "soft-registration"
 */
export async function register(req, res, next) {
    try {
        const { email, username, password, displayName } = req.body;
        const result = await authService.register({
            email,
            username,
            password,
            displayName,
        });

        return res.status(202).json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * POST /auth/verify-otp
 * Confirms the OTP, activates the account, returns a JWT.
 */
export async function verifyOtp(req, res, next) {
    try {
        const { userId, code } = req.body;
        const { user, accessToken } = await authService.verifyOtp({ userId, code });

        return res.status(200).json({
            accessToken,
            tokenType: "Bearer",
            expiresIn: config.jwt.expiry,
            user: user.toJSON(),
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /auth/resend-otp
 * Invalidates older codes and sends a fresh OTP to the user's email.
 */
export async function resendOtp(req, res, next) {
    try {
        const { userId } = req.body;
        const result = await authService.resendOtp({ userId });
        return res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * POST /auth/login
 */
export async function login(req, res, next) {
    try {
        const { identifier, password } = req.body;
        const { user, accessToken } = await authService.login({ identifier, password });

        return res.status(200).json({
            accessToken,
            tokenType: "Bearer",
            expiresIn: config.jwt.expiry,
            user: user.toJSON(),
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /auth/introspect
 * Used by other microservices to validate a token.
 */
export async function introspect(req, res, next) {
    try {
        const { token } = req.body;
        const result = await authService.introspect(token);
        return res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /auth/jwks
 * Expose the RSA public key so other services can verify JWTs independently.
 */
export function jwks(_req, res) {
    return res.status(200).json({
        publicKey: getPublicKey(),
        algorithm: "RS256",
    });
}

/**
 * POST /auth/forgot-password
 * Sends a reset link to the email if it belongs to a fully verified account.
 * Always returns the same generic response to prevent email enumeration.
 */
export async function forgotPassword(req, res, next) {
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword({ email });
        return res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * POST /auth/reset-password
 * Validates the reset token and applies the new password.
 */
export async function resetPassword(req, res, next) {
    try {
        const { token, password } = req.body;
        const result = await authService.resetPassword({ token, password });
        return res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}
