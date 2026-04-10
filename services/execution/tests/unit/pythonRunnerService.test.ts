import { describe, expect, it } from "vitest";
import {
  normalizeOutput,
  parseRuntimeError,
  parseSyntaxError,
} from "@/services/pythonRunnerService.js";

describe("pythonRunnerService helpers", () => {
  it("normalizes output by trimming and normalizing line endings", () => {
    expect(normalizeOutput("hello\r\nworld\n")).toBe("hello\nworld");
  });

  it("parses syntax errors with line and column", () => {
    const error = parseSyntaxError(`
  File \"/tmp/submission.py\", line 3
    print(\"x\"
             ^
SyntaxError: '(' was never closed
`);

    expect(error).toEqual({
      type: "SyntaxError",
      message: "'(' was never closed",
      line: 3,
      column: 14,
    });
  });

  it("parses runtime errors from traceback output", () => {
    const error = parseRuntimeError(`
Traceback (most recent call last):
  File \"/tmp/submission.py\", line 1, in <module>
    print(1/0)
ZeroDivisionError: division by zero
`);

    expect(error).toEqual({
      type: "ZeroDivisionError",
      message: "division by zero",
    });
  });
});
