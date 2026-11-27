import { describe, it, expect } from "vitest";
import { getInitials, getAvatarColor } from "./avatar";

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

describe("getAvatarColor", () => {
  it("returns consistent colors for the same user", () => {
    const username = "demo_mia_ahmed_100";

    expect(getAvatarColor(username)).toEqual(
      getAvatarColor(username)
    );
  });

  it("returns different colors for sample users", () => {
    const colors = [
      "demo_mia_ahmed_100",
      "demo_sebastian_moore_093",
      "demo_priya_garcia_055",
    ].map((username) =>
      getAvatarColor(username).backgroundColor
    );

    expect(new Set(colors).size).toBeGreaterThan(1);
  });

  it("handles empty usernames", () => {
    expect(getAvatarColor("")).toHaveProperty(
      "backgroundColor"
    );
  });
});