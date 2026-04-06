import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import * as api from "../api/userApi.ts";
import type { ApiError } from "../api/userApi.ts";
import { useAuth } from "../context/AuthContext.tsx";

export default function AuthOverlay() {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { setAuthenticatedUser } = useAuth();
    const navigate = useNavigate();

    // ── Login ──
    const [identifier, setIdentifier] = useState("");
    const [loginPassword, setLoginPassword] = useState("");

    // ── Register ──
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [displayName, setDisplayName] = useState("");

    async function handleLogin(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await api.login(identifier, loginPassword);
            setAuthenticatedUser(res.user);
        } catch (err) {
            setError((err as ApiError).data?.error || "Login failed");
        } finally {
            setLoading(false);
        }
    }

    async function handleRegister(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await api.register(email, username, regPassword, displayName);
            navigate("/verify-otp", { state: { userId: res.userId } });
        } catch (err) {
            setError((err as ApiError).data?.error || "Registration failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
                <h2 className="mb-5 text-center text-2xl font-semibold text-slate-900">{mode === "login" ? "Login" : "Create Account"}</h2>

                {error && <div className="mb-3 rounded-md bg-red-100 px-3 py-2 text-center text-sm text-red-700">{error}</div>}

                {mode === "login" ? (
                    <form onSubmit={handleLogin} className="space-y-3">
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Email or Username</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            required
                        />
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
                        <input
                            type="password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            required
                        />
                        <button className="mt-3 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300" disabled={loading}>
                            {loading ? "Logging in…" : "Login"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-3">
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            required
                        />
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            required
                            minLength={3}
                            maxLength={50}
                            pattern="^[a-zA-Z0-9_]+$"
                            title="Letters, numbers, and underscores only"
                        />
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
                        <input
                            type="password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            required
                            minLength={8}
                        />
                        <label className="mb-1 block text-sm font-semibold text-slate-700">Display Name (optional)</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            maxLength={100}
                        />
                        <button className="mt-3 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300" disabled={loading}>
                            {loading ? "Registering…" : "Register"}
                        </button>
                    </form>
                )}

                <div className="mt-5 text-center text-sm text-slate-600">
                    {mode === "login" ? (
                        <>
                            <span>No account? </span>
                            <button className="bg-transparent p-0 text-sm text-indigo-600 underline hover:text-indigo-700" onClick={() => { setMode("register"); setError(""); }}>
                                Register
                            </button>
                            <span> · </span>
                            <Link to="/forgot-password" className="text-sm text-indigo-600 underline hover:text-indigo-700">Forgot password?</Link>
                        </>
                    ) : (
                        <>
                            <span>Already have an account? </span>
                            <button className="bg-transparent p-0 text-sm text-indigo-600 underline hover:text-indigo-700" onClick={() => { setMode("login"); setError(""); }}>
                                Login
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
