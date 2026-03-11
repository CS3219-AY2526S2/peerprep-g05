const BASE = "http://localhost:3001/api/v1";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw { status: res.status, data };
  return data;
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── Auth ──────────────────────────────────────────────
export const register = (email, username, password, displayName) =>
  request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password, displayName: displayName || undefined }),
  });

export const verifyOtp = (userId, code) =>
  request("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ userId, code }),
  });

export const resendOtp = (userId) =>
  request("/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });

export const login = (identifier, password) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });

export const forgotPassword = (email) =>
  request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const resetPassword = (token, password) =>
  request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });

// ── User ──────────────────────────────────────────────
export const getMe = (token) =>
  request("/users/me", { headers: authHeader(token) });

export const updateMe = (token, fields) =>
  request("/users/me", {
    method: "PATCH",
    headers: authHeader(token),
    body: JSON.stringify(fields),
  });
