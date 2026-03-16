import { useState, type FormEvent } from "react";
import { useSearchParams, Link } from "react-router-dom";
import * as api from "../api/userApi.ts";
import type { ApiError } from "../api/userApi.ts";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const tokenFromUrl = searchParams.get("token") || "";

    const [token, setToken] = useState(tokenFromUrl);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        if (password !== confirm) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            await api.resetPassword(token, password);
            setDone(true);
        } catch (err) {
            setError((err as ApiError).data?.error || "Reset failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-[calc(100vh-52px)] items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
                <h2 className="mb-5 text-center text-2xl font-semibold text-slate-900">Reset Password</h2>

                {done ? (
                    <>
                        <div className="mb-3 rounded-md bg-emerald-100 px-3 py-2 text-center text-sm text-emerald-700">
                            Password has been reset successfully.
                        </div>
                        <Link to="/" className="mt-3 block w-full rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white no-underline hover:bg-indigo-700">
                            Back to Login
                        </Link>
                    </>
                ) : (
                    <>
                        {error && <div className="mb-3 rounded-md bg-red-100 px-3 py-2 text-center text-sm text-red-700">{error}</div>}
                        <form onSubmit={handleSubmit} className="space-y-3">
                            {!tokenFromUrl && (
                                <>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Reset Token</label>
                                    <input
                                        type="text"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                        required
                                    />
                                </>
                            )}
                            <label className="mb-1 block text-sm font-semibold text-slate-700">New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                required
                                minLength={8}
                            />
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Confirm Password</label>
                            <input
                                type="password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                required
                                minLength={8}
                            />
                            <button className="mt-3 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300" disabled={loading}>
                                {loading ? "Resetting…" : "Reset Password"}
                            </button>
                        </form>
                        <div className="mt-5 text-center text-sm text-slate-600">
                            <Link to="/" className="text-sm text-indigo-600 underline hover:text-indigo-700">Back to Login</Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
