import {
    fetchRequesterProfile,
    getBearerToken,
    isPrivilegedRole,
} from "../utils/requesterAuth.js";

export async function requirePrivilegedRequester(req, res, next) {
    try {
        if (!getBearerToken(req)) {
            return res.status(401).json({
                success: false,
                error: "Authorization bearer token is required",
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
