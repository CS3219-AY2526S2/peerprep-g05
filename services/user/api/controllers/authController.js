import authService from "../../domain/services/authService.js";
import { getPublicKey } from "../../infrastructure/security/jwt.js";
import config from "../../config/index.js";

/**
 * POST /auth/register
 */
export async function register(req, res, next) {
    try {
        const { email, username, password, displayName } = req.body;
        const { user, accessToken } = await authService.register({
            email,
            username,
            password,
            displayName,
        });

        return res.status(201).json({
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
