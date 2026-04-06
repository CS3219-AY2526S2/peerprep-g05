import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import * as api from "../api/userApi.ts";
import type { User } from "../api/userApi.ts";

interface AuthContextValue {
    token: string | null;
    user: User | null;
    loading: boolean;
    saveToken: (t: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(!!localStorage.getItem("token"));

    useEffect(() => {
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        api
            .getMe(token)
            .then((res) => setUser(res))
            .catch(() => {
                localStorage.removeItem("token");
                setToken(null);
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, [token]);

    function saveToken(t: string) {
        localStorage.setItem("token", t);
        setToken(t);
    }

    function logout() {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ token, user, loading, saveToken, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
