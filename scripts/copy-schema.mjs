// スキーマファイルを dist にコピー
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcSchema = join(__dirname, "..", "src", "mcp", "database", "schema.sql");
const destDir = join(__dirname, "..", "dist", "mcp", "database");
const destSchema = join(destDir, "schema.sql");

if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

copyFileSync(srcSchema, destSchema);
console.log("Copied schema.sql to dist/mcp/database/");
