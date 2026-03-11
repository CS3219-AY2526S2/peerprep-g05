import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import * as api from "../api/userApi.js";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
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
      setError(err.data?.error || "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="card">
        <h2>Reset Password</h2>

        {done ? (
          <>
            <div className="alert-success">
              Password has been reset successfully.
            </div>
            <Link to="/" className="btn btn-primary" style={{ display: "block", textAlign: "center" }}>
              Back to Login
            </Link>
          </>
        ) : (
          <>
            {error && <div className="alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              {!tokenFromUrl && (
                <>
                  <label>Reset Token</label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                  />
                </>
              )}
              <label>New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
              <button className="btn btn-primary" disabled={loading}>
                {loading ? "Resetting…" : "Reset Password"}
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
