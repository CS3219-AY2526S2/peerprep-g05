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
        <h1 className="mb-2 text-4xl font-semibold text-slate-900">
          Welcome to PeerPrep
        </h1>
        <p className="mb-8 text-lg text-slate-600">
          Collaborative technical interview preparation
        </p>

        {user && (
          <div className="inline-block rounded-xl bg-slate-50 px-8 py-6 text-left shadow">
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
