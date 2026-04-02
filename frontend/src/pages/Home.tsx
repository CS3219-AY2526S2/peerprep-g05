import { useAuth } from "../context/AuthContext.tsx";
import AuthOverlay from "../components/AuthOverlay.tsx";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-52px)] items-center justify-center">
        <p className="text-lg text-slate-500">Loading…</p>
      </div>
    );
  }
  const navigate = useNavigate();

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
        <div
          className="hover:cursor-pointer"
          onClick={() =>
            fetch(
              `${import.meta.env.VITE_COLLABORATIVE_API_BASE_URL}/collaboration`,
              {
                method: "POST",
                body: JSON.stringify({
                  // alice, abc
                  users: [
                    "0dcb3a6e-8038-4be0-802b-3401b397303a",
                    "282dbeb3-6e73-42d8-9a74-c5dc6de13604",
                  ],
                  // users: ["", "2a"],
                  questionId: Math.floor(Math.random() * 7).toString(),
                }),
                headers: {
                  "Content-Type": "application/json",
                },
              },
            )
              .then(async (res) => {
                const r = await res.json();
                console.log(r);
                return r.sessionId;
              })
              .then((sessionId) => {
                navigate(`/editor/${sessionId}`);
              })
          }
        >
          Create Editor
        </div>
      </div>
    </div>
  );
}
