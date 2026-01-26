#!/usr/bin/env node
/**
 * MCP Server エントリポイント
 *
 * stdio トランスポートで MCP Server を起動
 * 同期はバックグラウンドで実行（起動をブロックしない）
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMCPServer } from "./server.js";
import { initializeDatabase, closeDatabase } from "./database/database.js";
import { isSyncNeeded, performSync } from "./services/sync.service.js";
import * as logger from "./utils/logger.js";

// パッケージ情報
const PACKAGE_NAME = "m365-update";
const PACKAGE_VERSION = "0.3.5";

// データ古さの閾値（時間）- バックグラウンド同期用
const STALENESS_HOURS = 1; // 1時間ごとに同期試行

/**
 * バックグラウンド同期を実行
 */
async function backgroundSync(db: ReturnType<typeof initializeDatabase>): Promise<void> {
  if (!isSyncNeeded(db, STALENESS_HOURS)) {
    logger.info("Data is fresh, skipping background sync");
    return;
  }

  logger.info("Starting background sync");
  try {
    const result = await performSync(db);
    if (result.success) {
      logger.info("Background sync completed", {
        recordsProcessed: result.recordsProcessed,
        durationMs: result.durationMs,
      });
    }
  } catch (error) {
    const err = error as Error;
    logger.warn("Background sync failed", { error: err.message });
  }
}

/**
 * メイン関数
 */
async function main(): Promise<void> {
  logger.info("Starting M365 Update MCP Server", {
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
  });

  // データベース初期化（seed.db からコピーされる場合あり）
  const db = initializeDatabase();

  // MCP Server 作成（同期を待たずにすぐ起動）
  const server = createMCPServer({
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
    database: db,
  });

  // stdio トランスポート接続
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP Server running on stdio");

  // バックグラウンドで同期（非同期、起動をブロックしない）
  backgroundSync(db).catch((error) => {
    logger.warn("Background sync error", { error: (error as Error).message });
  });

  // クリーンアップ
  process.on("SIGINT", () => {
    logger.info("Received SIGINT, shutting down");
    closeDatabase();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM, shutting down");
    closeDatabase();
    process.exit(0);
  });
}

// 実行
main().catch((error) => {
  logger.error("Fatal error", { error: (error as Error).message });
  process.exit(1);
});
