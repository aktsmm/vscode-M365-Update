#!/usr/bin/env node
/**
 * MCP Server エントリポイント
 *
 * stdio トランスポートで MCP Server を起動
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMCPServer } from "./server.js";
import { initializeDatabase, closeDatabase } from "./database/database.js";
import { isSyncNeeded, performSync } from "./services/sync.service.js";
import * as logger from "./utils/logger.js";

// パッケージ情報
const PACKAGE_NAME = "m365-update";
const PACKAGE_VERSION = "0.1.0";

// データ古さの閾値（時間）
const STALENESS_HOURS = 24;

/**
 * メイン関数
 */
async function main(): Promise<void> {
  logger.info("Starting M365 Update MCP Server", {
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
  });

  // データベース初期化
  const db = initializeDatabase();

  // 初回または古いデータの場合は同期
  if (isSyncNeeded(db, STALENESS_HOURS)) {
    logger.info("Data is stale or missing, performing initial sync");
    try {
      await performSync(db);
    } catch (error) {
      const err = error as Error;
      logger.warn("Initial sync failed, continuing with stale data", {
        error: err.message,
      });
    }
  }

  // MCP Server 作成
  const server = createMCPServer({
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
    database: db,
  });

  // stdio トランスポート接続
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP Server running on stdio");

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
