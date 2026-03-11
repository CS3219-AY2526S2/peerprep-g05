import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import * as api from "../api/userApi.js";
import { useAuth } from "../context/AuthContext.jsx";
import "./VerifyOtp.css";

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { saveToken } = useAuth();
  const userId = location.state?.userId || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  if (!userId) {
    return (
      <div className="page-center">
        <div className="card">
          <h2>No registration in progress</h2>
          <p>Please <Link to="/">register</Link> first.</p>
        </div>
      </div>
    );
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await api.verifyOtp(userId, code);
      saveToken(res.accessToken);
      navigate("/");
    } catch (err) {
      setError(err.data?.error || "Verification failed");
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
      setError(err.data?.error || "Failed to resend OTP");
    }
  }

  return (
    <div className="page-center">
      <div className="card">
        <h2>Verify Your Email</h2>
        <p className="subtitle">Enter the 6-digit code sent to your email.</p>

        {error && <div className="alert-error">{error}</div>}
        {info && <div className="alert-success">{info}</div>}

        <form onSubmit={handleVerify}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="otp-input"
            required
          />
          <button className="btn btn-primary" disabled={loading || code.length !== 6}>
            {loading ? "Verifying…" : "Verify"}
          </button>
        </form>

        <div className="overlay-footer">
          <span>Didn't receive the code? </span>
          <button className="link-btn" onClick={handleResend}>Resend OTP</button>
        </div>
      </div>
    </div>
  );
}
