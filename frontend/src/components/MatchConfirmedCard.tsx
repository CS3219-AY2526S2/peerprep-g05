import { type ConfirmedMatch } from "../utils/types";
import { MatchInfoRow } from "./MatchInfoRow";
import { DifficultyBadge } from "./DifficultyBadge";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  confirmedMatch: ConfirmedMatch;
  onPlayAgain: () => void;
}

export function MatchConfirmedCard({ confirmedMatch, onPlayAgain }: Props) {
  const navigate = useNavigate();
  useEffect(() => {
    fetch(`${import.meta.env.VITE_COLLABORATIVE_API_BASE_URL}/collaboration`, {
      method: "POST",
      body: JSON.stringify({
        users: [confirmedMatch.userIdA, confirmedMatch.userIdB],
        // TODO: Get real question ID from backend when match is created
        questionId: "1",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(async (res) => {
        const r = await res.json();
        if (r.sessionId == null) {
          console.log("Create session response:", r.json());
          throw new Error("Invalid session ID in response");
        }
        return r.sessionId;
      })
      .then((sessionId) => {
        navigate(`/editor/${sessionId}`);
      })
      .catch((error) => {
        // TODO: Proper error handling
        alert("Error creating collaboration session.");
        console.error("Failed to create session:", error);
      });
  }, []);

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">
          Match Confirmed
        </h1>
        <p className="mt-1 text-slate-500">
          Both peers accepted — your session is ready
        </p>
      </div>

      <div className="rounded-xl bg-white px-8 py-7 shadow-sm border border-slate-200">
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
          ✓ Session ready
        </div>

        <div className="mb-6 divide-y divide-slate-100">
          <MatchInfoRow
            label="Match ID"
            value={
              <span className="font-mono text-xs text-slate-500">
                {confirmedMatch.matchId.slice(0, 16)}…
              </span>
            }
          />
          <MatchInfoRow label="Peer A" value={confirmedMatch.userIdA} />
          <MatchInfoRow label="Peer B" value={confirmedMatch.userIdB} />
          <MatchInfoRow label="Topic" value={confirmedMatch.topic} />
          <MatchInfoRow
            label="Difficulty"
            value={<DifficultyBadge difficulty={confirmedMatch.difficulty} />}
          />
        </div>

        <button
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={onPlayAgain}
        >
          Back to Matchmaking
        </button>
      </div>
    </div>
  );
}
