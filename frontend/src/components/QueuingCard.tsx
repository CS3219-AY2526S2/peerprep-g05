import { difficultyDot } from "../utils/constants";
import { Difficulty } from "../utils/types";
import { SearchingDots } from "./SearchingDots";

interface Props {
  userId: string;
  topic: string;
  difficulty: Difficulty;
  onCancel: () => void;
  elapsedFmt: string;
}

export function QueuingCard({ userId, topic, difficulty, onCancel, elapsedFmt }: Props) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">In Queue</h1>
        <p className="mt-1 text-slate-500">Hang tight while we find you a match</p>
      </div>

      <div className="rounded-xl bg-white px-8 py-7 shadow-sm border border-slate-200">
        <div className="mb-5">
          <SearchingDots />
        </div>

        <div className="mb-5 rounded-lg bg-slate-50 border border-slate-100 py-4 text-center">
          <span className="text-4xl font-semibold tabular-nums text-slate-900">{elapsedFmt}</span>
          <p className="mt-1 text-xs uppercase tracking-widest text-slate-400">Time elapsed</p>
        </div>

        <div className="mb-6 divide-y divide-slate-100">
          <div className="flex justify-between py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">User</span>
            <span className="text-sm font-medium text-slate-900">{userId}</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Topic</span>
            <span className="text-sm font-medium text-slate-900">{topic}</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Difficulty</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              <span className={`h-1.5 w-1.5 rounded-full ${difficultyDot[difficulty]}`} />
              <span className="capitalize text-slate-900">{difficulty}</span>
            </span>
          </div>
        </div>

        <button
          className="w-full rounded-lg border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          onClick={onCancel}
        >
          Cancel Matchmaking
        </button>
      </div>
    </div>
  );
}