import { type ConfirmedMatch } from "../utils/types";
import { MatchInfoRow } from "./MatchInfoRow";
import { DifficultyBadge } from "./DifficultyBadge";

interface Props {
  confirmedMatch: ConfirmedMatch;
  onPlayAgain:    () => void;
}

export function MatchConfirmedCard({ confirmedMatch, onPlayAgain }: Props) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Match Confirmed</h1>
        <p className="mt-1 text-slate-500">Both peers accepted — your session is ready</p>
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
          <MatchInfoRow label="Peer A"   value={confirmedMatch.userIdA} />
          <MatchInfoRow label="Peer B"   value={confirmedMatch.userIdB} />
          <MatchInfoRow label="Topic"      value={confirmedMatch.topic} />
          <MatchInfoRow label="Difficulty" value={<DifficultyBadge difficulty={confirmedMatch.difficulty} />} />
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