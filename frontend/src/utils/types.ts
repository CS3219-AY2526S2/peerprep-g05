import { DIFFICULTIES, STATE } from "./constants";

export type Difficulty = (typeof DIFFICULTIES)[number];
export type FSMState = (typeof STATE)[keyof typeof STATE];

export interface MatchInfo {
  userId: string;
  topic: string;
  difficulty: Difficulty;
  matchId: string;
}

export interface ProposedMatch {
  matchId: string;
}

export interface ConfirmedMatch {
  matchId: string;
  userIdA: string;
  userIdB: string;
  topic: string;
  difficulty: Difficulty;
}