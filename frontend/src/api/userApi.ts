import { GATEWAY_URL } from "../utils/types";

const BASE = `${GATEWAY_URL}/api/v1`;

if (!BASE) {
    throw new Error("GATEWAY_URL is not set. Define it in the frontend .env file.");
}

export interface ApiError {
    status: number;
    data: { error?: string; details?: { field: string; message: string }[] } | null;
}

export interface User {
    id: string;
    email: string;
    username: string;
    display_name: string;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface LoginResponse {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    user: User;
}

export interface RegisterResponse {
    userId: string;
    message: string;
}

export interface VerifyOtpResponse {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    user: User;
}

export type AdminUser = User;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: { "Content-Type": "application/json", ...options.headers },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw { status: res.status, data } as ApiError;
    return data as T;
}

function authHeader(token: string): HeadersInit {
    return { Authorization: `Bearer ${token}` };
}

// ── Auth ──────────────────────────────────────────────
export const register = (email: string, username: string, password: string, displayName?: string) =>
    request<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, username, password, displayName: displayName || undefined }),
    });

export const verifyOtp = (userId: string, code: string) =>
    request<VerifyOtpResponse>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ userId, code }),
    });

export const resendOtp = (userId: string) =>
    request<{ message: string }>("/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ userId }),
    });

export const login = (identifier: string, password: string) =>
    request<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
    });

export const forgotPassword = (email: string) =>
    request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
    });

export const resetPassword = (token: string, password: string) =>
    request<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
    });

// ── User ──────────────────────────────────────────────
export const getMe = (token: string) =>
    request<User>("/users/me", { headers: authHeader(token) });

export const updateMe = (token: string, fields: Partial<Pick<User, "display_name" | "email" | "username">>) =>
    request<User>("/users/me", {
        method: "PATCH",
        headers: authHeader(token),
        body: JSON.stringify(fields),
    });

// ── Admin ─────────────────────────────────────────────
export const listAllUsers = (token: string) =>
    request<AdminUser[]>("/admin/users", {
        headers: authHeader(token),
    });

export const promoteUserToAdmin = (token: string, userId: string) =>
    request<AdminUser>(`/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: authHeader(token),
        body: JSON.stringify({ role: "ADMIN" }),
    });
