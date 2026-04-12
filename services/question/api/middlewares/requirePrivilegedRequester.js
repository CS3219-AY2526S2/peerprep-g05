import {
    extractToken,
    fetchRequesterProfile,
    isPrivilegedRole,
} from "../utils/requesterAuth.js";

export async function requirePrivilegedRequester(req, res, next) {
    try {
        if (!extractToken(req)) {
            return res.status(401).json({
                success: false,
                error: "Authentication token is required",
            });
        }

        const requester = await fetchRequesterProfile(req);
        if (!requester) {
            return res.status(401).json({
                success: false,
                error: "Invalid or expired token",
            });
        }

        if (!isPrivilegedRole(requester.role)) {
            return res.status(403).json({
                success: false,
                error: "Insufficient privileges for this operation",
            });
        }

        req.requester = requester;
        return next();
    } catch (error) {
        return next(error);
    }
}
