import { isTokenFresh, verifyToken } from "../../infrastructure/security/jwt.js";
import userRepository from "../../infrastructure/database/repositories/userRepository.js";
import { readAuthCookie } from "../../infrastructure/security/authCookie.js";

/**
 * JWT authentication middleware.
 * Verifies the token, checks the user still exists and is active in the DB,
 * then attaches the user principal to `req.user`.
 */
export function authenticateStrict(req, res, next) {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;
    const cookieToken = readAuthCookie(req);
    const token = bearerToken || cookieToken;

    if (!token) {
        return res.status(401).json({ error: "Missing authentication token" });
    }

    try {
        const decoded = verifyToken(token);

        // Verify user is still active
        userRepository.findById(decoded.sub).then((row) => {
            if (!row) {
                return res.status(401).json({ error: "User no longer exists" });
            }
            if (!row.is_active) {
                return res.status(403).json({ error: "Account is deactivated" });
            }
            if (!isTokenFresh(decoded, row.token_valid_after)) {
                return res.status(401).json({ error: "Token is no longer valid" });
            }

            req.user = {
                id: decoded.sub,
                role: row.role, // use live role from DB, not stale JWT claim
            };
            next();
        }).catch(() => {
            return res.status(500).json({ error: "Authentication check failed" });
        });

    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expired" });
        }
        return res.status(401).json({ error: "Invalid token" });
    }
}
