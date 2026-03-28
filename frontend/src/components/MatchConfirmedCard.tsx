import { difficultyDot } from "../utils/constants";
import { ConfirmedMatch } from "../utils/types";

interface Props {
  matchData: ConfirmedMatch | null;
  onPlayAgain: () => void;
}

export function MatchConfirmedCard({ matchData, onPlayAgain }: Props) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Match Confirmed</h1>
        <p className="mt-1 text-slate-500">Both players accepted — your session is ready</p>
      </div>

      <div className="rounded-xl bg-white px-8 py-7 shadow-sm border border-slate-200">
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
          ✓ Session ready
        </div>

        <div className="mb-6 divide-y divide-slate-100">
          <div className="flex justify-between py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Match ID</span>
            <span className="font-mono text-xs text-slate-500">{matchData?.matchId?.slice(0, 16)}…</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Topic</span>
            <span className="text-sm font-medium text-slate-900">{matchData?.topic}</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Difficulty</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              <span
                className={`h-1.5 w-1.5 rounded-full ${difficultyDot[matchData?.difficulty ?? "easy"]}`}
              />
              <span className="capitalize text-slate-900">{matchData?.difficulty}</span>
            </span>
          </div>
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