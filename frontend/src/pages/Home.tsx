import { useAuth } from "../context/AuthContext.tsx";
import AuthOverlay from "../components/AuthOverlay.tsx";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <p className="text-lg text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-52px)] items-center justify-center">
      {!user && <AuthOverlay />}

      <div className="p-8 text-center">
        <h1 className="mb-2 text-4xl font-semibold" style={{ color: "var(--app-text)" }}>
          Welcome to{" "}
          <span aria-label="PeerPrep" role="text">
            <span className="text-red-500">P</span>
            <span className="text-orange-500">e</span>
            <span className="text-yellow-500">e</span>
            <span className="text-green-500">r</span>
            <span className="text-blue-500">P</span>
            <span className="text-indigo-500">r</span>
            <span className="text-violet-500">e</span>
            <span className="text-pink-500">p</span>
          </span>
        </h1>
        <p className="mb-8 text-lg" style={{ color: "var(--app-text)", opacity: 0.8 }}>
          Collaborative technical interview preparation
        </p>

        {user && (
          <div className="inline-block rounded-xl bg-slate-50 px-8 py-6 text-left text-slate-800 shadow">
            <h3 className="mb-4 text-xl font-semibold text-slate-900">
              Your Profile
            </h3>
            <table className="border-collapse">
              <tbody>
                <tr>
                  <td className="pr-4 py-1 align-top">
                    <strong>Username</strong>
                  </td>
                  <td className="py-1">{user.username}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-1 align-top">
                    <strong>Display Name</strong>
                  </td>
                  <td className="py-1">{user.display_name}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-1 align-top">
                    <strong>Email</strong>
                  </td>
                  <td className="py-1">{user.email}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-1 align-top">
                    <strong>Role</strong>
                  </td>
                  <td className="py-1">{user.role}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
