export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL;
export const WS_URL      = import.meta.env.VITE_MATCHING_WEBSOCKET_URL;

export const TOPICS = [
  "Arrays",
  "Graphs",
  "Dynamic Programming",
  "Binary Trees",
  "Sorting Algorithms",
];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = typeof DIFFICULTIES[number];

export const STATE = {
  IDLE:      "idle",
  QUEUING:   "queuing",
  PROPOSED:  "proposed",
  CONFIRMED: "confirmed",
  FOUND:    "found",
} as const;
export type FSMState = typeof STATE[keyof typeof STATE];

export interface MatchInfo {
  topic:      string;
  difficulty: Difficulty;
  matchId:    string;
}

export interface ProposedMatch {
  matchId: string;
  peer:    string;
}

export interface ConfirmedMatch {
  matchId:    string;
  userIdA:    string;
  userIdB:    string;
  topic:      string;
  difficulty: Difficulty;
}

export interface QuestionMatchInfo {
  matchId:    string;
  userIdA:    string;
  userIdB:    string;
  sessionId: string;
  questionId: string;
}

export const difficultyColor: Record<Difficulty, string> = {
  easy:   "text-emerald-600 bg-emerald-50 border-emerald-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  hard:   "text-red-600 bg-red-50 border-red-200",
};

export const difficultyDot: Record<Difficulty, string> = {
  easy:   "bg-emerald-500",
  medium: "bg-amber-500",
  hard:   "bg-red-500",
};