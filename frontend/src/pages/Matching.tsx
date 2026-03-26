import { useState, useEffect, useRef, useCallback } from "react";

const GATEWAY_URL = "http://localhost:4000";
const WS_URL = "ws://localhost:4001";

const TOPICS = ["Arrays", "Graphs", "Dynamic Programming", "Binary Trees", "Sorting Algorithms"];
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
type Difficulty = typeof DIFFICULTIES[number];

const STATE = {
  IDLE: "idle",
  QUEUING: "queuing",
  PROPOSED: "proposed",
  CONFIRMED: "confirmed",
} as const;
type FSMState = typeof STATE[keyof typeof STATE];

const difficultyColor: Record<Difficulty, string> = {
  easy:   "text-emerald-600 bg-emerald-50 border-emerald-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  hard:   "text-red-600 bg-red-50 border-red-200",
};

const difficultyDot: Record<Difficulty, string> = {
  easy:   "bg-emerald-500",
  medium: "bg-amber-500",
  hard:   "bg-red-500",
};

// ─── Timer Hook ────────────────────────────────────────────────────────────────
function useTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  const reset = () => setElapsed(0);
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return { elapsed, fmt: fmt(elapsed), reset };
}

// ─── Countdown Hook ────────────────────────────────────────────────────────────
function useCountdown(seconds: number, running: boolean) {
  const [left, setLeft] = useState(seconds);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setLeft(seconds); }, [seconds]);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return { left, fmt: fmt(left), expired: left === 0 };
}

// ─── Pulsing dots ──────────────────────────────────────────────────────────────
function SearchingDots() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`inline-block h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
            tick > i ? "bg-slate-500" : "bg-slate-200"
          }`}
        />
      ))}
      <span className="text-xs uppercase tracking-widest text-slate-400 ml-1">
        Searching for opponent
      </span>
    </div>
  );
}

// ─── Match Form Card ────────────────────────────────────────────────────────────
function MatchFormCard({
  onFindMatch,
  error,
  loading,
}: {
  onFindMatch: (args: { userId: string; topic: string; difficulty: Difficulty }) => void;
  error: string;
  loading: boolean;
}) {
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
              {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▼</span>
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

// ─── Queuing Card ──────────────────────────────────────────────────────────────
function QueuingCard({
  userId,
  topic,
  difficulty,
  onCancel,
  elapsedFmt,
}: {
  userId: string;
  topic: string;
  difficulty: Difficulty;
  onCancel: () => void;
  elapsedFmt: string;
}) {
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
            <span className={`inline-flex items-center gap-1.5 text-sm font-medium`}>
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

// ─── Match Proposed Modal ──────────────────────────────────────────────────────
function MatchProposedModal({
  peer,
  userId,
  topic,
  difficulty,
  onAccept,
  onDecline,
  accepted,
  proposalSecs,
}: {
  matchId: string;
  peer: string;
  userId: string;
  topic: string;
  difficulty: Difficulty;
  onAccept: () => void;
  onDecline: () => void;
  accepted: boolean;
  proposalSecs: number;
}) {
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
          <div className="flex justify-between py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">You</span>
            <span className="text-sm font-medium text-slate-900">{userId}</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Opponent</span>
            <span className="text-sm font-medium text-slate-900">{peer || "—"}</span>
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

// ─── Match Confirmed Card ──────────────────────────────────────────────────────
function MatchConfirmedCard({
  matchData,
  onPlayAgain,
}: {
  matchData: { matchId: string; userIdA: string; userIdB: string; topic: string; difficulty: Difficulty } | null;
  onPlayAgain: () => void;
}) {
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
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Player A</span>
            <span className="text-sm font-medium text-slate-900">{matchData?.userIdA}</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Player B</span>
            <span className="text-sm font-medium text-slate-900">{matchData?.userIdB}</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Topic</span>
            <span className="text-sm font-medium text-slate-900">{matchData?.topic}</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Difficulty</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              <span className={`h-1.5 w-1.5 rounded-full ${difficultyDot[matchData?.difficulty ?? "easy"]}`} />
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

// ─── Main Matching Page ────────────────────────────────────────────────────────
export default function Matching() {
  const [fsm, setFsm] = useState<FSMState>(STATE.IDLE);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{ userId: string; topic: string; difficulty: Difficulty; matchId: string } | null>(null);
  const [proposedMatch, setProposedMatch] = useState<{ matchId: string; peer: string } | null>(null);
  const [confirmedMatch, setConfirmedMatch] = useState<{ matchId: string; userIdA: string; userIdB: string; topic: string; difficulty: Difficulty } | null>(null);
  const [accepted, setAccepted] = useState(false);

  const ws = useRef<WebSocket | null>(null);
  const { fmt: elapsedFmt, reset: resetTimer } = useTimer(fsm === STATE.QUEUING);

  const disconnectWs = useCallback(() => {
    if (ws.current) { ws.current.close(); ws.current = null; }
  }, []);

  // ── Always-fresh handler ref ───────────────────────────────────────────────
  // Keeps a stable ref to the latest handleWsMessage so the socket's onmessage
  // never captures a stale closure, which was causing MATCH_PROPOSED to
  // sometimes not open the modal.
  const handleWsMessage = useCallback((msg: any) => {
    switch (msg.type) {
      case "MATCH_WAITING":
        setAccepted(false);
        setProposedMatch(null);
        setFsm(STATE.QUEUING);
        resetTimer();
        break;
      case "MATCH_PROPOSED":
        setProposedMatch({ matchId: msg.match_id, peer: msg.peer });
        setAccepted(false);
        setFsm(STATE.PROPOSED);
        break;
      case "MATCH_ACCEPTED":
        setAccepted(true);
        break;
      case "MATCH_CONFIRMED":
        setConfirmedMatch({
          matchId: msg.match_id,
          userIdA: msg.user_id_a,
          userIdB: msg.user_id_b,
          topic: matchInfo?.topic ?? "",
          difficulty: matchInfo?.difficulty ?? "easy",
        });
        setFsm(STATE.CONFIRMED);
        break;
      case "MATCH_CANCELLED":
        disconnectWs();
        setError("Match was declined.");
        setFsm(STATE.IDLE);
        break;
      case "MATCH_TIMEOUT":
        // Timed-out user is treated as a soft decline — back to IDLE.
        // The user who accepted gets MATCH_WAITING instead and is requeued.
        disconnectWs();
        setProposedMatch(null);
        setAccepted(false);
        setError("Match proposal timed out.");
        setFsm(STATE.IDLE);
        break;
    }
  }, [matchInfo, resetTimer, disconnectWs]);

  const handleWsMessageRef = useRef(handleWsMessage);
  useEffect(() => {
    handleWsMessageRef.current = handleWsMessage;
  }, [handleWsMessage]);

  // connectWs has no deps — onmessage always delegates to the latest handler
  // via the ref, so we never need to re-attach it when state changes.
  const connectWs = useCallback((userId: string) => {
    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(`${WS_URL}?user_id=${userId}`);
      socket.onopen = () => { ws.current = socket; resolve(socket); };
      socket.onerror = () => reject(new Error("WebSocket connection failed"));
      socket.onmessage = (event) => {
        let msg: any;
        try { msg = JSON.parse(event.data); } catch { return; }
        handleWsMessageRef.current(msg); // always calls the latest version
      };
      socket.onclose = () => console.log("[WS] Disconnected");
    });
  }, []); // stable — no deps needed

  const handleFindMatch = async ({ userId, topic, difficulty }: { userId: string; topic: string; difficulty: Difficulty }) => {
    setError("");
    setLoading(true);
    try {
      await connectWs(userId);
      const res = await fetch(`${GATEWAY_URL}/api/v1/matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, topic, difficulty }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to enter matchmaking");
      }
      const data = await res.json();
      setMatchInfo({ userId, topic, difficulty, matchId: data.match_id });
      resetTimer();
      setFsm(STATE.QUEUING);
    } catch (err: any) {
      disconnectWs();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await fetch(`${GATEWAY_URL}/api/v1/matches`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: matchInfo?.userId, topic: matchInfo?.topic, difficulty: matchInfo?.difficulty }),
      });
    } catch {}
    disconnectWs();
    setFsm(STATE.IDLE);
    setMatchInfo(null);
  };

  const handleAccept = async () => {
    if (accepted) return;
    setAccepted(true);
    try {
      await fetch(`${GATEWAY_URL}/api/v1/matches/${proposedMatch?.matchId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: matchInfo?.userId }),
      });
    } catch { setAccepted(false); }
  };

  const handleDecline = async () => {
    if (accepted) return;
    try {
      await fetch(`${GATEWAY_URL}/api/v1/matches/${proposedMatch?.matchId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: matchInfo?.userId }),
      });
    } catch {}
    disconnectWs();
    setFsm(STATE.IDLE);
    setMatchInfo(null);
    setProposedMatch(null);
  };

  const handleReset = () => {
    setFsm(STATE.IDLE);
    setError("");
    setMatchInfo(null);
    setProposedMatch(null);
    setConfirmedMatch(null);
    setAccepted(false);
    disconnectWs();
  };

  const showModal =
    (fsm === STATE.QUEUING || fsm === STATE.PROPOSED) && proposedMatch != null;

  return (
    <div className="relative flex min-h-[calc(100vh-52px)] items-center justify-center p-8">
      {fsm === STATE.IDLE && (
        <MatchFormCard onFindMatch={handleFindMatch} error={error} loading={loading} />
      )}

      {fsm === STATE.QUEUING && matchInfo && (
        <QueuingCard
          userId={matchInfo.userId}
          topic={matchInfo.topic}
          difficulty={matchInfo.difficulty}
          onCancel={handleCancel}
          elapsedFmt={elapsedFmt}
        />
      )}

      {fsm === STATE.CONFIRMED && (
        <MatchConfirmedCard matchData={confirmedMatch} onPlayAgain={handleReset} />
      )}

      {showModal && proposedMatch && matchInfo && (
        <MatchProposedModal
          matchId={proposedMatch.matchId}
          peer={proposedMatch.peer}
          userId={matchInfo.userId}
          topic={matchInfo.topic}
          difficulty={matchInfo.difficulty}
          onAccept={handleAccept}
          onDecline={handleDecline}
          accepted={accepted}
          proposalSecs={25}
        />
      )}
    </div>
  );
}