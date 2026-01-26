/**
 * データベース初期化・管理
 *
 * SQLite with WAL mode, FTS5 for full-text search
 */

import Database from "better-sqlite3";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

import { copyFileSync } from "fs";

// ESM-friendly __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * seed.db のパスを取得（パッケージ同梱）
 */
function getSeedDatabasePath(): string {
  // dist/mcp/database/database.js から resources/seed.db への相対パス
  return join(__dirname, "..", "..", "..", "resources", "seed.db");
}

/**
 * seed.db をユーザーディレクトリにコピー（DBがない場合のみ）
 */
function copySeedDatabaseIfNeeded(targetPath: string): boolean {
  // 既にDBが存在する場合はスキップ
  if (existsSync(targetPath)) {
    return false;
  }

  const seedPath = getSeedDatabasePath();
  if (!existsSync(seedPath)) {
    // seed.db がない場合（開発中など）はスキップ
    return false;
  }

  // ディレクトリ作成
  const targetDir = dirname(targetPath);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // コピー実行
  copyFileSync(seedPath, targetPath);
  console.error(`[m365-update] Initialized database from seed.db`);
  return true;
}

/**
 * データベース設定
 */
export interface DatabaseConfig {
  /** データベースファイルパス */
  path?: string;
  /** 読み取り専用モード */
  readonly?: boolean;
  /** 詳細ログ出力 */
  verbose?: boolean;
}

let dbInstance: Database.Database | null = null;

/**
 * デフォルトのデータベースパスを取得
 */
function getDefaultDatabasePath(): string {
  const dataDir = join(homedir(), ".m365-update");
  return join(dataDir, "m365-roadmap.db");
}

/**
 * データベースを初期化
 */
export function initializeDatabase(
  config: DatabaseConfig = {},
): Database.Database {
  const dbPath = config.path ?? getDefaultDatabasePath();

  // seed.db からコピー（DBがない場合のみ）
  copySeedDatabaseIfNeeded(dbPath);

  // ディレクトリ作成
  const dataDir = dirname(dbPath);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // データベース接続
  const db = new Database(dbPath, {
    readonly: config.readonly ?? false,
    verbose: config.verbose ? console.error : undefined,
  });

  // パフォーマンス最適化
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("cache_size = -64000"); // 64MB
  db.pragma("temp_store = MEMORY");
  db.pragma("foreign_keys = ON");

  // スキーマ適用
  if (!isSchemaInitialized(db)) {
    applySchema(db);
  }

  return db;
}

/**
 * シングルトンデータベースインスタンスを取得
 */
export function getDatabase(config?: DatabaseConfig): Database.Database {
  if (!dbInstance) {
    dbInstance = initializeDatabase(config);
  }
  return dbInstance;
}

/**
 * データベース接続を閉じる
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * スキーマが初期化済みか確認
 */
function isSchemaInitialized(db: Database.Database): boolean {
  const result = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'",
    )
    .get() as { name: string } | undefined;

  return result !== undefined;
}

/**
 * スキーマを適用
 */
function applySchema(db: Database.Database): void {
  const schemaPath = join(__dirname, "schema.sql");
  const schemaSql = readFileSync(schemaPath, "utf-8");
  db.exec(schemaSql);
}

/**
 * データベース統計を取得
 */
export function getDatabaseStats(db: Database.Database): {
  featureCount: number;
  productCount: number;
  platformCount: number;
  databaseSizeKB: number;
} {
  const featureCount = (
    db.prepare("SELECT COUNT(*) as count FROM m365_features").get() as {
      count: number;
    }
  ).count;
  const productCount = (
    db
      .prepare("SELECT COUNT(DISTINCT product) as count FROM feature_products")
      .get() as { count: number }
  ).count;
  const platformCount = (
    db
      .prepare(
        "SELECT COUNT(DISTINCT platform) as count FROM feature_platforms",
      )
      .get() as { count: number }
  ).count;

  const pageCount = db.pragma("page_count", { simple: true }) as number;
  const pageSize = db.pragma("page_size", { simple: true }) as number;
  const databaseSizeKB = Math.round((pageCount * pageSize) / 1024);

  return {
    featureCount,
    productCount,
    platformCount,
    databaseSizeKB,
  };
}
