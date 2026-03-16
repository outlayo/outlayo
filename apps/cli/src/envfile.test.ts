import { describe, expect, it } from "vitest";
import { mergeEnv, parseEnv, serializeEnv } from "./envfile.js";

describe("envfile helpers", () => {
  it("parses and merges env values while preserving order", () => {
    const parsed = parseEnv("A=1\nB=2\n");
    const merged = mergeEnv(parsed, { B: "20", C: "3" });
    expect(merged.order).toEqual(["A", "B", "C"]);
    expect(serializeEnv(merged)).toContain("B=20");
    expect(serializeEnv(merged)).toContain("C=3");
  });
});
