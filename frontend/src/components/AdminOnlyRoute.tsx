import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { isAdminRole } from "../utils/roles.ts";

export default function AdminOnlyRoute({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex min-h-[calc(100vh-52px)] items-center justify-center text-slate-500">Loading…</div>;
    }

    if (!user || !isAdminRole(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
