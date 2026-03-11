import { useAuth } from "../context/AuthContext.jsx";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate("/");
    }

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand">PeerPrep</Link>
            <div className="navbar-right">
                {user ? (
                    <>
                        <span className="navbar-user">Logged in as: <strong>{user.display_name || user.username}</strong></span>
                        <button className="btn btn-sm" onClick={handleLogout}>Logout</button>
                    </>
                ) : (
                    <Link to="/" className="btn btn-sm">Login</Link>
                )}
            </div>
        </nav>
    );
}
