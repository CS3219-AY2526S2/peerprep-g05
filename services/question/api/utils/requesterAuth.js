const USER_SERVICE_BASE_URL = process.env.USER_SERVICE_BASE_URL || "http://localhost:3001/api/v1";

const PRIVILEGED_ROLES = new Set(["ADMIN", "MASTER_ADMIN"]);

export function getBearerToken(req) {
    const authHeader = req.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7).trim();
    return token || null;
}

export function isPrivilegedRole(role) {
    return PRIVILEGED_ROLES.has(String(role || "").toUpperCase());
}

export async function fetchRequesterProfile(req) {
    const token = getBearerToken(req);
    if (!token) return null;

    try {
        const res = await fetch(`${USER_SERVICE_BASE_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return null;

        const user = await res.json().catch(() => null);
        if (!user?.id) return null;

        return {
            id: String(user.id),
            role: String(user.role || "").toUpperCase(),
        };
    } catch {
        return null;
    }
}

export async function isPrivilegedRequester(req) {
    const requester = await fetchRequesterProfile(req);
    return requester ? isPrivilegedRole(requester.role) : false;
}
