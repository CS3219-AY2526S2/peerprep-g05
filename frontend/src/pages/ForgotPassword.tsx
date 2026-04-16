import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import * as api from "../api/userApi.ts";
import type { ApiError } from "../api/userApi.ts";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await api.forgotPassword(email);
            setSent(true);
        } catch (err) {
            setError((err as ApiError).data?.error || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-[calc(100vh-52px)] items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
                <h2 className="mb-5 text-center text-2xl font-semibold text-slate-900">Forgot Password</h2>

                {sent ? (
                    <>
                        <div className="mb-3 rounded-md bg-emerald-100 px-3 py-2 text-center text-sm text-emerald-700">
                            If an account with that email exists, a reset link has been sent.
                        </div>
                        <Link to="/" className="mt-3 block w-full rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white no-underline hover:bg-indigo-700">
                            Back to Login
                        </Link>
                    </>
                ) : (
                    <>
                        {error && <div className="mb-3 rounded-md bg-red-100 px-3 py-2 text-center text-sm text-red-700">{error}</div>}
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                required
                            />
                            <button className="mt-3 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300" disabled={loading}>
                                {loading ? "Sending…" : "Send Reset Link"}
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
