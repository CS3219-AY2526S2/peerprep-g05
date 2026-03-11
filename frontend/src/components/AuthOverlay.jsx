import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import * as api from "../api/userApi.js";
import { useAuth } from "../context/AuthContext.jsx";
import "./AuthOverlay.css";

export default function AuthOverlay() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { saveToken } = useAuth();
  const navigate = useNavigate();

  // ── Login ──
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // ── Register ──
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(identifier, loginPassword);
      saveToken(res.accessToken);
    } catch (err) {
      setError(err.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.register(email, username, regPassword, displayName);
      // Navigate to OTP page with userId
      navigate("/verify-otp", { state: { userId: res.userId } });
    } catch (err) {
      setError(err.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overlay-backdrop">
      <div className="overlay-card">
        <h2>{mode === "login" ? "Login" : "Create Account"}</h2>

        {error && <div className="alert-error">{error}</div>}

        {mode === "login" ? (
          <form onSubmit={handleLogin}>
            <label>Email or Username</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
            <label>Password</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
            <button className="btn btn-primary" disabled={loading}>
              {loading ? "Logging in…" : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              pattern="^[a-zA-Z0-9_]+$"
              title="Letters, numbers, and underscores only"
            />
            <label>Password</label>
            <input
              type="password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              required
              minLength={8}
            />
            <label>Display Name (optional)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
            />
            <button className="btn btn-primary" disabled={loading}>
              {loading ? "Registering…" : "Register"}
            </button>
          </form>
        )}

        <div className="overlay-footer">
          {mode === "login" ? (
            <>
              <span>No account? </span>
              <button className="link-btn" onClick={() => { setMode("register"); setError(""); }}>
                Register
              </button>
              <span> · </span>
              <Link to="/forgot-password" className="link-btn">Forgot password?</Link>
            </>
          ) : (
            <>
              <span>Already have an account? </span>
              <button className="link-btn" onClick={() => { setMode("login"); setError(""); }}>
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
