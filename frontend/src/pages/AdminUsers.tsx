import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import * as api from "../api/userApi.ts";
import type { AdminUser, ApiError } from "../api/userApi.ts";
import "./AdminUsers.css";

export default function AdminUsers() {
    const { token } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        setLoading(true);
        setError("");
        api
            .listAllUsers(token)
            .then((res) => setUsers(res))
            .catch((err: ApiError) => setError(err.data?.error || "Failed to fetch users"))
            .finally(() => setLoading(false));
    }, [token]);

    async function handlePromote(userId: string) {
        if (!token) return;

        setError("");
        setSuccess("");
        setUpdatingUserId(userId);
        try {
            await api.promoteUserToAdmin(token, userId);
            setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: "ADMIN" } : u)));
            setSuccess("User promoted to ADMIN successfully.");
        } catch (err) {
            setError((err as ApiError).data?.error || "Failed to promote user");
        } finally {
            setUpdatingUserId(null);
        }
    }

    return (
        <div className="admin-users-page">
            <div className="admin-users-card">
                <h2>Admin User Management</h2>
                <p className="admin-subtitle">All users in the system</p>

                {error && <div className="alert-error">{error}</div>}
                {success && <div className="alert-success">{success}</div>}

                {loading ? (
                    <p>Loading users…</p>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-users-table">
                            <thead>
                                <tr>
                                    <th>User ID</th>
                                    <th>Email</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="mono">{user.id}</td>
                                        <td>{user.email}</td>
                                        <td>{user.username}</td>
                                        <td>{user.role}</td>
                                        <td>
                                            {user.role === "ADMIN" ? (
                                                <span className="already-admin">Already ADMIN</span>
                                            ) : (
                                                <button
                                                    className="btn btn-primary btn-promote"
                                                    onClick={() => handlePromote(user.id)}
                                                    disabled={updatingUserId === user.id}
                                                >
                                                    {updatingUserId === user.id ? "Promoting…" : "Promote to ADMIN"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
