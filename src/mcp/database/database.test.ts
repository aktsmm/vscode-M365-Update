/**
 * Database tests - seed.db コピー機能のテスト
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, unlinkSync, mkdirSync, rmSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";
import Database from "better-sqlite3";

// プロジェクトルートからの相対パスで seed.db を参照
const projectRoot = resolve(__dirname, "..", "..", "..");
const seedDbPath = join(projectRoot, "resources", "seed.db");

describe("Seed Database", () => {
  it("seed.db が存在すること", () => {
    expect(existsSync(seedDbPath)).toBe(true);
  });

  it("seed.db にデータが含まれていること", () => {
    const db = new Database(seedDbPath, { readonly: true });
    const result = db
      .prepare("SELECT COUNT(*) as count FROM m365_features")
      .get() as { count: number };

    // 少なくとも 1000 件以上のデータがあるはず
    expect(result.count).toBeGreaterThan(1000);

    db.close();
  });

  it("seed.db に FTS インデックスがあること", () => {
    const db = new Database(seedDbPath, { readonly: true });

    // FTS 検索が動作するか確認
    const result = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM m365_features_fts 
      WHERE m365_features_fts MATCH 'Teams'
    `,
      )
      .get() as { count: number };

    expect(result.count).toBeGreaterThan(0);

    db.close();
  });

  it("seed.db に sync_checkpoint が設定されていること", () => {
    const db = new Database(seedDbPath, { readonly: true });

    const checkpoint = db
      .prepare(
        `
      SELECT last_sync, record_count FROM sync_checkpoint WHERE id = 1
    `,
      )
      .get() as { last_sync: string; record_count: number } | undefined;

    expect(checkpoint).toBeDefined();
    expect(checkpoint!.record_count).toBeGreaterThan(0);
    expect(checkpoint!.last_sync).toMatch(/^\d{4}-\d{2}-\d{2}/);

    db.close();
  });
});

describe("Database Copy Logic", () => {
  const testDir = join(homedir(), ".m365-update-test-" + Date.now());
  const testDbPath = join(testDir, "test.db");
  let testDb: Database.Database | null = null;

  beforeAll(() => {
    // テスト用ディレクトリ作成
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // DB を確実にクローズ
    if (testDb) {
      try {
        testDb.close();
      } catch {
        // ignore
      }
      testDb = null;
    }
    // 少し待ってからクリーンアップ
    setTimeout(() => {
      try {
        if (existsSync(testDir)) {
          rmSync(testDir, { recursive: true, force: true });
        }
      } catch {
        // ignore cleanup errors
      }
    }, 100);
  });

  it("seed.db からコピーしたDBが正常に動作すること", async () => {
    // seed.db をコピー
    const { copyFileSync } = await import("fs");
    copyFileSync(seedDbPath, testDbPath);

    // 動作確認
    testDb = new Database(testDbPath);

    const count = testDb
      .prepare("SELECT COUNT(*) as count FROM m365_features")
      .get() as { count: number };
    expect(count.count).toBeGreaterThan(0);

    // 書き込みも可能か確認
    testDb.pragma("journal_mode = DELETE"); // WAL を使わない

    testDb.close();
    testDb = null;
  });
});
