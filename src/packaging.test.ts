import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

const projectRoot = resolve(__dirname, "..");
const vscodeIgnorePath = join(projectRoot, ".vscodeignore");
const seedDbPath = join(projectRoot, "resources", "seed.db");

describe("Packaging configuration", () => {
  it("bundled seed database is present in the repository", () => {
    expect(existsSync(seedDbPath)).toBe(true);
  });

  it("re-includes resources/seed.db after global database excludes", () => {
    const ignoreRules = readFileSync(vscodeIgnorePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const globalDbExcludeIndex = ignoreRules.indexOf("*.db");
    const seedIncludeIndex = ignoreRules.indexOf("!resources/seed.db");

    expect(globalDbExcludeIndex).toBeGreaterThanOrEqual(0);
    expect(seedIncludeIndex).toBeGreaterThan(globalDbExcludeIndex);
  });

  it("keeps compiled MCP test artifacts out of the VSIX payload", () => {
    const ignoreRules = readFileSync(vscodeIgnorePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    expect(ignoreRules).toContain("dist/**/*.test.js");
    expect(ignoreRules).toContain("dist/**/test-*.js");
  });

  it("excludes local artifacts and SQLite sidecar files from the VSIX payload", () => {
    const ignoreRules = readFileSync(vscodeIgnorePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    expect(ignoreRules).toContain("artifacts/**");
    expect(ignoreRules).toContain("resources/seed.db-wal");
    expect(ignoreRules).toContain("resources/seed.db-shm");
  });

  it("trims unused MCP SDK client and example payloads", () => {
    const ignoreRules = readFileSync(vscodeIgnorePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    expect(ignoreRules).toContain(
      "node_modules/@modelcontextprotocol/sdk/dist/cjs/client/**",
    );
    expect(ignoreRules).toContain(
      "node_modules/@modelcontextprotocol/sdk/dist/cjs/examples/**",
    );
    expect(ignoreRules).toContain(
      "node_modules/@modelcontextprotocol/sdk/dist/esm/client/**",
    );
    expect(ignoreRules).toContain(
      "node_modules/@modelcontextprotocol/sdk/dist/esm/examples/**",
    );
  });

  it("excludes development-only packaging config files", () => {
    const ignoreRules = readFileSync(vscodeIgnorePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    expect(ignoreRules).toContain("eslint.config.mjs");
  });

  it("excludes temporary audit reports from the VSIX payload", () => {
    const ignoreRules = readFileSync(vscodeIgnorePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    expect(ignoreRules).toContain(".audit*.json");
  });
});
