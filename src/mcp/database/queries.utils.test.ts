import { describe, it, expect } from "vitest";
import { buildFtsPrefixQuery } from "./queries.js";

describe("buildFtsPrefixQuery", () => {
  it("通常語をプレフィックスクエリへ変換すること", () => {
    expect(buildFtsPrefixQuery("Teams Copilot")).toBe("Teams* Copilot*");
  });

  it("記号を除去してもトークンが残る場合はクエリを返すこと", () => {
    expect(buildFtsPrefixQuery("Teams (Preview)!")).toBe("Teams* Preview*");
  });

  it("記号のみの場合は null を返すこと", () => {
    expect(buildFtsPrefixQuery("(((***)))")).toBeNull();
  });

  it("区切り記号だけのトークンは null を返すこと", () => {
    expect(buildFtsPrefixQuery("--- ___ -_-")).toBeNull();
  });
});
