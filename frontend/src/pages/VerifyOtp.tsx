import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import * as api from "../api/userApi.ts";
import type { ApiError } from "../api/userApi.ts";
import { useAuth } from "../context/AuthContext.tsx";

export default function VerifyOtp() {
    const location = useLocation();
    const navigate = useNavigate();
    const { setAuthenticatedUser } = useAuth();
    const userId = (location.state as { userId?: string } | null)?.userId || "";

    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [loading, setLoading] = useState(false);

    if (!userId) {
        return (
            <div className="flex min-h-[calc(100vh-52px)] items-center justify-center px-4">
                <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
                    <h2 className="mb-3 text-center text-2xl font-semibold text-slate-900">No registration in progress</h2>
                    <p>Please <Link to="/">register</Link> first.</p>
                </div>
            </div>
        );
    }

    async function handleVerify(e: FormEvent) {
        e.preventDefault();
        setError("");
        setInfo("");
        setLoading(true);
        try {
            const res = await api.verifyOtp(userId, code);
            setAuthenticatedUser(res.user);
            navigate("/");
        } catch (err) {
            setError((err as ApiError).data?.error || "Verification failed");
        } finally {
            setLoading(false);
        }
    }

    async function handleResend() {
        setError("");
        setInfo("");
        try {
            await api.resendOtp(userId);
            setInfo("A new OTP has been sent to your email.");
        } catch (err) {
            setError((err as ApiError).data?.error || "Failed to resend OTP");
        }
    }

    return (
        <div className="flex min-h-[calc(100vh-52px)] items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
                <h2 className="mb-1 text-center text-2xl font-semibold text-slate-900">Verify Your Email</h2>
                <p className="mb-5 text-center text-slate-600">Enter the 6-digit code sent to your email.</p>

                {error && <div className="mb-3 rounded-md bg-red-100 px-3 py-2 text-center text-sm text-red-700">{error}</div>}
                {info && <div className="mb-3 rounded-md bg-emerald-100 px-3 py-2 text-center text-sm text-emerald-700">{info}</div>}

                <form onSubmit={handleVerify}>
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="mb-4 w-full rounded-md border border-slate-300 px-3 py-3 text-center text-3xl tracking-[0.6em] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        required
                    />
                    <button className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300" disabled={loading || code.length !== 6}>
                        {loading ? "Verifying…" : "Verify"}
                    </button>
                </form>

                <div className="mt-5 text-center text-sm text-slate-600">
                    <span>Didn't receive the code? </span>
                    <button className="bg-transparent p-0 text-sm text-indigo-600 underline hover:text-indigo-700" onClick={handleResend}>Resend OTP</button>
                </div>
            </div>
        </div>
    );
}
