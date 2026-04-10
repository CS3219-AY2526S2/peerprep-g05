import { describe, expect, it } from "vitest";
import { stripMarkdownCodeFence } from "@/services/aiClientService.js";

describe("stripMarkdownCodeFence", () => {
  it("strips fenced python blocks", () => {
    const input = "```python\nprint('hello')\n```";
    expect(stripMarkdownCodeFence(input)).toBe("print('hello')");
  });

  it("strips generic fenced blocks", () => {
    const input = "```\nprint('hello')\n```";
    expect(stripMarkdownCodeFence(input)).toBe("print('hello')");
  });

  it("keeps plain python unchanged", () => {
    const input = "print('hello')\n";
    expect(stripMarkdownCodeFence(input)).toBe(input);
  });
});
