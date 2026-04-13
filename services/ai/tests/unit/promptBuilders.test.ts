import { describe, expect, it } from "vitest";
import {
  buildInterviewCoachMessages,
  buildPseudocodeToPythonMessages,
  interviewCoachSystemPrompt,
  pseudocodeToPythonSystemPrompt,
} from "@/services/promptBuilders.js";

describe("prompt builders", () => {
  it("builds the interview coach prompt with the user context", () => {
    const messages = buildInterviewCoachMessages({
      prompt: "What should I inspect next?",
      codeSnippet: "for i in range(len(nums)):\n    pass",
      question: "Find the best time to buy and sell stock.",
    });

    expect(messages[0]).toEqual({
      role: "system",
      content: interviewCoachSystemPrompt,
    });
    expect(messages[1]?.content).toContain(
      "Find the best time to buy and sell stock.",
    );
    expect(messages[1]?.content).toContain("What should I inspect next?");
    expect(messages[1]?.content).toContain(
      "Do not assume the code is being edited automatically.",
    );
  });

  it("builds the pseudocode conversion prompt without question context", () => {
    const messages = buildPseudocodeToPythonMessages({
      pseudocode: "set total to 0\nfor each item in arr\n  add item to total",
    });

    expect(messages[0]).toEqual({
      role: "system",
      content: pseudocodeToPythonSystemPrompt,
    });
    expect(messages[1]?.content).toContain(
      "Convert the following pseudocode to Python exactly as written in logic.",
    );
    expect(messages[1]?.content).toContain("set total to 0");
    expect(messages[0]?.content).toContain(
      "Do not use top-level `return` statements.",
    );
    expect(messages[0]?.content).toContain(
      "Read inputs from standard input (`stdin`) when input handling is needed.",
    );
    expect(messages[0]?.content).toContain(
      "Produce output using `print` when the pseudocode returns or outputs a result.",
    );
  });
});
