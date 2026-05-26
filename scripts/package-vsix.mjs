#!/usr/bin/env node

import { mkdirSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const outputDir = join("artifacts", "vsix");
const outputPath = join(
  outputDir,
  `${packageJson.name}-${packageJson.version}.vsix`,
);
const vsceBinPath = join("node_modules", "@vscode", "vsce", "vsce");

mkdirSync(outputDir, { recursive: true });
rmSync(outputPath, { force: true });

const result = spawnSync(
  process.execPath,
  [vsceBinPath, "package", "--out", outputPath],
  {
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
