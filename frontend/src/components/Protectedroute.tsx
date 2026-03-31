import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";


export default function ProtectedRoute() {
    const { user, loading } = useAuth();

    if (loading) return null;

    if (!user) return <Navigate to="/" replace />;

    return <Outlet />;
}