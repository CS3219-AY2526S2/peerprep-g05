import { Difficulty } from "./types";

export const GATEWAY_URL = "http://localhost:4000";
export const WS_URL = "ws://localhost:4001";
export const PROPOSAL_SECS = 25;

export const TOPICS = [
  "Arrays",
  "Graphs",
  "Dynamic Programming",
  "Binary Trees",
  "Sorting Algorithms",
];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export const STATE = {
  IDLE: "idle",
  QUEUING: "queuing",
  PROPOSED: "proposed",
  CONFIRMED: "confirmed",
} as const;

export const difficultyColor: Record<Difficulty, string> = {
  easy: "text-emerald-600 bg-emerald-50 border-emerald-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  hard: "text-red-600 bg-red-50 border-red-200",
};

export const difficultyDot: Record<Difficulty, string> = {
  easy: "bg-emerald-500",
  medium: "bg-amber-500",
  hard: "bg-red-500",
};