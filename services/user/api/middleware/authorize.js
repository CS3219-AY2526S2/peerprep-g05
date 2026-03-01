/**
 * Role-based authorization middleware factories.
 */

/**
 * Require the request to be authenticated (req.user must exist).
 */
export function requireAuth() {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        next();
    };
}

/**
 * Require the authenticated user to have a specific role.
 * Must be used AFTER authenticate middleware.
 * @param {...string} roles Allowed roles (e.g. "ADMIN")
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Insufficient permissions" });
        }
        next();
    };
}
