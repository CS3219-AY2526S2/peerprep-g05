import { useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../api/userApi.js";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="card">
        <h2>Forgot Password</h2>

        {sent ? (
          <>
            <div className="alert-success">
              If an account with that email exists, a reset link has been sent.
            </div>
            <Link to="/" className="btn btn-primary" style={{ display: "block", textAlign: "center" }}>
              Back to Login
            </Link>
          </>
        ) : (
          <>
            {error && <div className="alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button className="btn btn-primary" disabled={loading}>
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
            <div className="overlay-footer">
              <Link to="/" className="link-btn">Back to Login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
