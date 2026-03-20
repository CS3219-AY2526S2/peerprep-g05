import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import * as api from "../api/userApi.ts";
import type { AdminUser, ApiError } from "../api/userApi.ts";
import { isAdminRole } from "../utils/roles.ts";

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
        <div className="p-8">
            <div className="mx-auto max-w-[1200px] rounded-xl bg-white p-6 shadow">
                <h2 className="m-0 text-2xl font-semibold text-slate-900">Admin User Management</h2>
                <p className="mb-4 mt-1 text-slate-600">All users in the system</p>

                {error && <div className="mb-3 rounded-md bg-red-100 px-3 py-2 text-center text-sm text-red-700">{error}</div>}
                {success && <div className="mb-3 rounded-md bg-emerald-100 px-3 py-2 text-center text-sm text-emerald-700">{success}</div>}

                {loading ? (
                    <p>Loading users…</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-[900px] w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="border-b border-slate-200 px-3 py-3 text-left text-sm text-slate-700">User ID</th>
                                    <th className="border-b border-slate-200 px-3 py-3 text-left text-sm text-slate-700">Email</th>
                                    <th className="border-b border-slate-200 px-3 py-3 text-left text-sm text-slate-700">Username</th>
                                    <th className="border-b border-slate-200 px-3 py-3 text-left text-sm text-slate-700">Role</th>
                                    <th className="border-b border-slate-200 px-3 py-3 text-left text-sm text-slate-700">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="border-b border-slate-200 px-3 py-3 align-middle font-mono text-sm">{user.id}</td>
                                        <td className="border-b border-slate-200 px-3 py-3 align-middle">{user.email}</td>
                                        <td className="border-b border-slate-200 px-3 py-3 align-middle">{user.username}</td>
                                        <td className="border-b border-slate-200 px-3 py-3 align-middle">{user.role}</td>
                                        <td className="border-b border-slate-200 px-3 py-3 align-middle">
                                            {isAdminRole(user.role) ? (
                                                <span className="font-semibold text-emerald-700">
                                                    {user.role === "MASTER_ADMIN" ? "MASTER_ADMIN" : "Already ADMIN"}
                                                </span>
                                            ) : (
                                                <button
                                                    className="w-auto rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
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
