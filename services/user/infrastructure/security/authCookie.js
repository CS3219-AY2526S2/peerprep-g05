import config from "../../config/index.js";

function parseBoolean(value, fallback) {
    if (value === undefined) {
        return fallback;
    }
    return value === "true";
}

function normalizeSameSite(value) {
    const allowed = ["lax", "strict", "none"];
    const normalized = String(value || "lax").toLowerCase();
    return allowed.includes(normalized) ? normalized : "lax";
}

export function getAuthCookieName() {
    return process.env.AUTH_COOKIE_NAME || "peerprep_access_token";
}

export function getAuthCookieOptions() {
    const secure = parseBoolean(process.env.AUTH_COOKIE_SECURE, config.nodeEnv !== "development");
    const sameSite = normalizeSameSite(process.env.AUTH_COOKIE_SAMESITE);

    return {
        httpOnly: true,
        secure,
        sameSite,
        path: "/",
        maxAge: config.jwt.expiry * 1000,
    };
}

export function readAuthCookie(req) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
        return null;
    }

    const cookieName = getAuthCookieName();
    const cookies = cookieHeader.split(";");

    for (const rawCookie of cookies) {
        const [name, ...rest] = rawCookie.trim().split("=");
        if (name === cookieName) {
            return decodeURIComponent(rest.join("="));
        }
    }

    return null;
}

export function setAuthCookie(res, token) {
    res.cookie(getAuthCookieName(), token, getAuthCookieOptions());
}

export function clearAuthCookie(res) {
    res.clearCookie(getAuthCookieName(), getAuthCookieOptions());
}
