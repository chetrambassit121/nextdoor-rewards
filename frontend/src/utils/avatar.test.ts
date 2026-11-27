import { describe, it, expect } from "vitest";
import { getInitials } from "./avatar";

describe("getInitials", () => {
  it("returns initials for fictional users", () => {
    expect(getInitials("demo_mia_ahmed_100")).toBe("MA");
    expect(getInitials("demo_sebastian_moore_093")).toBe("SM");
    expect(getInitials("demo_priya_garcia_055")).toBe("PG");
  });

  it("supports regular usernames", () => {
    expect(getInitials("johnsmith")).toBe("JO");
    expect(getInitials("alex")).toBe("AL");
  });

  it("handles empty usernames", () => {
    expect(getInitials("")).toBe("U");
    expect(getInitials("   ")).toBe("U");
  });

  it("handles single-character usernames", () => {
    expect(getInitials("a")).toBe("A");
  });
});