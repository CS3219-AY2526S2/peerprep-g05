import { verifyToken } from "../../infrastructure/security/jwt.js";
import userRepository from "../../infrastructure/database/repositories/userRepository.js";

/**
 * JWT authentication middleware.
 * Verifies the token, checks the user still exists and is active in the DB,
 * then attaches the user principal to `req.user`.
 */
export function authenticateStrict(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or malformed Authorization header" });
    }

    const token = authHeader.split(" ")[1];

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
