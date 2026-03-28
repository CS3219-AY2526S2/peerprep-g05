import { useState } from "react";
import { DIFFICULTIES, TOPICS, difficultyColor } from "../utils/constants";
import { Difficulty } from "../utils/types";

interface Props {
  onFindMatch: (args: { userId: string; topic: string; difficulty: Difficulty }) => void;
  error: string;
  loading: boolean;
}

export function MatchFormCard({ onFindMatch, error, loading }: Props) {
  const [userId, setUserId] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  const handleSubmit = () => {
    if (!userId.trim()) return;
    onFindMatch({ userId: userId.trim(), topic, difficulty });
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Find a Match</h1>
        <p className="mt-1 text-slate-500">Get paired with a peer for a live coding session</p>
      </div>

      <div className="rounded-xl bg-white px-8 py-7 shadow-sm border border-slate-200">
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">
            User ID
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-slate-400 focus:bg-white"
            placeholder="e.g. user123"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">
            Topic
          </label>
          <div className="relative">
            <select
              className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white cursor-pointer"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              ▼
            </span>
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-400">
            Difficulty
          </label>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 rounded-lg border py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  difficulty === d
                    ? difficultyColor[d]
                    : "border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <button
          className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Connecting…" : "Find Match"}
        </button>
      </div>
    </div>
  );
}