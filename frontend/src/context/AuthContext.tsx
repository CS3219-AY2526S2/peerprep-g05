import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import * as api from "../api/userApi.ts";
import type { User } from "../api/userApi.ts";

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    setAuthenticatedUser: (nextUser: User | null) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);
        api
            .getMe()
            .then((res) => {
                if (!cancelled) {
                    setUser(res);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setUser(null);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    function setAuthenticatedUser(nextUser: User | null) {
        setUser(nextUser);
    }

    async function logout() {
        try {
            await api.logout();
        } catch {
            // Clear local auth state even if the network request fails.
        }
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, loading, setAuthenticatedUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
