import { type Difficulty, difficultyDot } from "../utils/types";

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${difficultyDot[difficulty]}`} />
      <span className="capitalize">{difficulty}</span>
    </span>
  );
}