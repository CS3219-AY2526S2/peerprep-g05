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

    useEffect(() => {
        document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
        localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    }, [isDarkMode]);

    function handleLogout() {
        logout();
        navigate("/");
    }

    function toggleTheme() {
        setIsDarkMode((prev) => !prev);
    }

    function SunIcon() {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="M4.93 4.93l1.41 1.41" />
                <path d="M17.66 17.66l1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="M4.93 19.07l1.41-1.41" />
                <path d="M17.66 6.34l1.41-1.41" />
            </svg>
        );
    }

    function MoonIcon() {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3c.37 0 .74.02 1.1.07a7 7 0 1 0 8.62 8.72c.04.33.07.66.07 1z" />
            </svg>
        );
    }

    const navBtn = "rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white no-underline transition hover:bg-white/20";
    const subtleBtn = "rounded border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25";

    return (
        <nav className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-6 py-3 text-slate-200">
            <div className="flex flex-wrap items-center gap-4">
                <Link to="/" className="text-xl font-bold no-underline" aria-label="PeerPrep">
                    <span className="text-red-500">P</span>
                    <span className="text-orange-500">e</span>
                    <span className="text-yellow-500">e</span>
                    <span className="text-green-500">r</span>
                    <span className="text-blue-500">P</span>
                    <span className="text-indigo-500">r</span>
                    <span className="text-violet-500">e</span>
                    <span className="text-pink-500">p</span>
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                    <Link to="/matching" className={navBtn}>
                        Match
                    </Link>
                    <Link to="/questions" className={navBtn}>
                        Questions
                    </Link>
                </div>
                {user && (
                    <div className="flex flex-wrap items-center gap-2">
                        {isAdminRole(user.role) && (
                            <Link to="/admin/users" className={`${subtleBtn} no-underline`}>Admin Users</Link>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                {user ? (
                    <>
                        <span className="text-sm">Logged in as: <strong>{user.display_name || user.username}</strong></span>
                        <button className={navBtn} onClick={handleLogout}>Logout</button>
                    </>
                ) : (
                    <Link to="/" className={navBtn}>Login</Link>
                )}
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex items-center justify-center rounded-md border border-white/30 bg-white/15 p-2 text-white transition hover:bg-white/25"
                    aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                    title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                    {isDarkMode ? <MoonIcon /> : <SunIcon />}
                </button>
            </div>
        </nav>
    );
}
