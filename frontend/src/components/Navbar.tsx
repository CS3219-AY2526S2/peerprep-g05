import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { Link, useNavigate } from "react-router-dom";
import { isAdminRole } from "../utils/roles.ts";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const useDarkMode = savedTheme ? savedTheme === "dark" : prefersDark;
        setIsDarkMode(useDarkMode);
    }, []);

  return (
    <nav className="flex items-center justify-between bg-slate-900 px-6 py-3 text-slate-200">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-xl font-bold text-white no-underline">
          PeerPrep
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/matching" className="nav-button">
            Match
          </Link>
          <Link to="/questions" className="nav-button">
            Questions
          </Link>
          {user && (
            <Link to="/attempt-history" className="nav-button">
              Attempt History
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            {isAdminRole(user.role) && (
              <Link
                to="/admin/users"
                className="rounded border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-white/25"
              >
                Admin Users
              </Link>
            )}
            <span className="text-sm">
              Logged in as:{" "}
              <strong>{user.display_name || user.username}</strong>
            </span>
            <button
              className="rounded border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/"
              className="rounded border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-white/25"
            >
              Login
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
