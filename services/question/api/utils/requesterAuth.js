const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:4000";
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "peerprep_access_token";

const PRIVILEGED_ROLES = new Set(["ADMIN", "MASTER_ADMIN"]);

export function extractToken(req) {
    const authHeader = req.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7).trim();
        if (token) return token;
    }

    const cookieHeader = req.get("cookie") || "";
    if (!cookieHeader) return null;

    const rawCookies = cookieHeader.split(";");
    for (const rawCookie of rawCookies) {
        const [name, ...rest] = rawCookie.trim().split("=");
        if (name !== AUTH_COOKIE_NAME) continue;

        const rawValue = rest.join("=");
        if (!rawValue) return null;

        try {
            return decodeURIComponent(rawValue);
        } catch {
            return rawValue;
        }
    }

    return null;
}

export function isPrivilegedRole(role) {
    return PRIVILEGED_ROLES.has(String(role || "").toUpperCase());
}

export async function fetchRequesterProfile(req) {
    const token = extractToken(req);
    if (!token) return null;

    try {
        const res = await fetch(`${GATEWAY_URL}/api/v1/auth/introspect`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
        });

        if (!res.ok) return null;

        const data = await res.json().catch(() => null);
        if (!data?.active || !data?.userId) return null;

        return {
            id: String(data.userId),
            role: String(data.accountRole || data.role || "").toUpperCase(),
        };
    } catch {
        return null;
    }
}

export async function isPrivilegedRequester(req) {
    const requester = await fetchRequesterProfile(req);
    return requester ? isPrivilegedRole(requester.role) : false;
}
