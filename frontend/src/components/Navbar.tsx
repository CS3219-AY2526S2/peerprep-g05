import { useAuth } from "../context/AuthContext.tsx";
import { Link, useNavigate } from "react-router-dom";
import { isAdminRole } from "../utils/roles.ts";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
      logout();
      navigate("/");
    }

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
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {isAdminRole(user.role) && (
                <Link to="/admin/users" className="button-class">
                  Admin Users
                </Link>
              )}
              <span className="text-sm">
                Logged in as:{" "}
                <strong>{user.display_name || user.username}</strong>
              </span>
              <button className="button-class" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/" className="button-class">
              Login
            </Link>
          )}
        </div>
      </nav>
    );
}
