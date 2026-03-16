import { describe, expect, it } from "vitest";
import { runDoctor } from "./doctor.js";

describe("doctor", () => {
  it("fails when enabled connector misses required keys", () => {
    const result = runDoctor({ OPENAI_ENABLED: "true", OPENAI_API_KEY: "" });
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.includes("OPENAI_API_KEY"))).toBe(true);
  });

  it("passes with valid enabled connector", () => {
    const result = runDoctor({ OPENAI_ENABLED: "true", OPENAI_API_KEY: "abc" });
    expect(result.ok).toBe(true);
  });
});
