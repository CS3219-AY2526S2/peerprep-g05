import { type MatchInfo, type ProposedMatch } from "../utils/types";
import { useCountdown } from "../hooks/useCountdown";
import { MatchInfoRow } from "./MatchInfoRow";
import { DifficultyBadge } from "./DifficultyBadge";

interface Props {
  matchInfo:     MatchInfo;
  proposedMatch: ProposedMatch;
  onAccept:      () => void;
  onDecline:     () => void;
  accepted:      boolean;
  proposalSecs:  number;
}

export function MatchProposedModal({
  matchInfo,
  proposedMatch,
  onAccept,
  onDecline,
  accepted,
  proposalSecs,
}: Props) {
  const { left, fmt } = useCountdown(proposalSecs, true);
  const ratio = left / proposalSecs;
  const timerColor =
    ratio > 0.5 ? "text-emerald-600" : ratio > 0.2 ? "text-amber-500" : "text-red-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-white px-8 py-7 shadow-lg border border-slate-200 mx-4">
        <div className="mb-1 text-center text-xs font-semibold uppercase tracking-widest text-amber-500">
          Match Found
        </div>
        <h2 className="mb-5 text-center text-2xl font-semibold text-slate-900">Opponent Awaits</h2>

        <div className="mb-5 rounded-lg bg-slate-50 border border-slate-100 py-4 text-center">
          <span className={`text-4xl font-semibold tabular-nums ${timerColor}`}>{fmt}</span>
          <p className="mt-1 text-xs uppercase tracking-widest text-slate-400">Time to accept</p>
        </div>

        <div className="mb-5 divide-y divide-slate-100">
          <MatchInfoRow label="You"        value={matchInfo.userId} />
          <MatchInfoRow label="Opponent"   value={proposedMatch.peer || "—"} />
          <MatchInfoRow label="Topic"      value={matchInfo.topic} />
          <MatchInfoRow label="Difficulty" value={<DifficultyBadge difficulty={matchInfo.difficulty} />} />
        </div>

        {accepted ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
            ✓ Accepted — waiting for opponent…
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={onDecline}
            >
              Decline
            </button>
            <button
              className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              onClick={onAccept}
            >
              Accept
            </button>
          </div>
        )}
      </div>
    </div>
  );
}