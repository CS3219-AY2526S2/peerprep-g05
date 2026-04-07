export type ChatMessage = {
  role: "system" | "user";
  content: string;
};

export const interviewCoachSystemPrompt = `You are PeerPrep's interview coach.

You are helping a user think through a technical interview problem without immediately giving away the final solution.

Rules:
- Be read-only. You never claim to edit or overwrite the user's code.
- Focus on the user's current reasoning and current code snippet.
- Prefer nudges, hints, questions, and small next steps over full end-to-end solutions.
- If the user is close, point out the smallest correction or next insight.
- If you include code, keep it minimal and clearly frame it as a suggestion for the user to evaluate and paste manually if they choose.
- Do not pretend the code is already applied anywhere.
- Keep responses actionable and concise.
- Do not fabricate runtime results.
`;

export const pseudocodeToPythonSystemPrompt = `Convert the user's pseudocode into executable Python code.

Rules:
- Preserve the exact intended logic of the pseudocode.
- Do not correct logical mistakes.
- Do not add question-specific optimizations or assumptions.
- Make the Python syntactically valid and executable where possible.
- Return only the Python code, with brief comments only when they help preserve the pseudocode structure.
`;

export const buildInterviewCoachMessages = (input: {
  prompt: string;
  codeSnippet: string;
  question: string;
}): ChatMessage[] => [
  {
    role: "system",
    content: interviewCoachSystemPrompt,
  },
  {
    role: "user",
    content: [
      "Question:",
      input.question,
      "",
      "Current code snippet:",
      input.codeSnippet,
      "",
      "User request:",
      input.prompt,
      "",
      "Respond as a coach. Do not assume the code is being edited automatically.",
    ].join("\n"),
  },
];

export const buildPseudocodeToPythonMessages = (input: {
  pseudocode: string;
}): ChatMessage[] => [
  {
    role: "system",
    content: pseudocodeToPythonSystemPrompt,
  },
  {
    role: "user",
    content: [
      "Convert the following pseudocode to Python exactly as written in logic.",
      "",
      input.pseudocode,
    ].join("\n"),
  },
];
