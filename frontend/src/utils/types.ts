// ── Types ─────────────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard";

export type MatchStatus =
    | "idle"
    | "connecting"
    | "searching"
    | "proposed"   // peer found, awaiting acceptance
    | "accepting"  // current user accepted, waiting for peer
    | "matched"    // both confirmed
    | "timeout"
    | "error";

export interface MatchForm {
    user_id: string;
    topic: string;
    difficulty: Difficulty;
}

export interface MatchResult {
    match_id: string;
    peer: string;
}

export interface WSMessage {
    type:
        | "MATCH_WAITING"
        | "MATCH_PROPOSED"
        | "MATCH_ACCEPTED"
        | "MATCH_CANCELLED"
        | "MATCH_TIMEOUT"
        | "MATCH_CONFIRMED"
        | "error";
    match_id?: string;
    peer?: string;
    message?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const TOPICS = [
    "Arrays & Hashing",
    "Two Pointers",
    "Sliding Window",
    "Stack",
    "Binary Search",
    "Linked List",
    "Trees",
    "Graphs",
    "Dynamic Programming",
    "Greedy",
    "Intervals",
    "Bit Manipulation",
] as const;

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
    { value: "easy",   label: "Easy"   },
    { value: "medium", label: "Medium" },
    { value: "hard",   label: "Hard"   },
];

export const WS_URL          = "ws://localhost:4001";
export const GATEWAY_URL     = "http://localhost:4000";
export const WS_TIMEOUT_MS   = 600_000;
export const PROPOSAL_TIMEOUT_S  = 30; // seconds to accept/decline a proposal