/**
 * sync_m365_roadmap ツール
 *
 * M365 Roadmap データを API から同期
 */

import type Database from "better-sqlite3";
import { performSync, getSyncStatus } from "../services/sync.service.js";
import {
  createSuccessResponse,
  createErrorResponse,
  type ToolResponse,
} from "../types.js";
import * as logger from "../utils/logger.js";

/**
 * ツールスキーマ
 */
export const syncM365RoadmapSchema = {
  name: "sync_m365_roadmap",
  description:
    "Synchronize M365 Roadmap data from the official API. " +
    "Fetches all features and stores them in the local database. " +
    "Use this to update the local cache with the latest roadmap data.",
  inputSchema: {
    type: "object",
    properties: {
      force: {
        type: "boolean",
        description: "Force sync even if data is fresh (default: false).",
      },
    },
  },
};

/**
 * 同期ツールのハンドラ
 */
export async function handleSyncM365Roadmap(
  db: Database.Database,
  args: unknown,
): Promise<ToolResponse> {
  const params = args as { force?: boolean };

  logger.info("sync_m365_roadmap called", { force: params.force });

  try {
    // 現在のステータス確認
    const status = getSyncStatus(db);

    if (!params.force && status && status.hoursSinceSync < 1) {
      logger.info("Data is fresh, skipping sync", {
        hoursSinceSync: status.hoursSinceSync,
      });
      return createSuccessResponse({
        message: "Data is fresh, sync skipped",
        lastSync: status.lastSync,
        recordCount: status.recordCount,
        hoursSinceSync: status.hoursSinceSync,
        hint: "Use force=true to sync anyway",
      });
    }

    // 同期実行
    const result = await performSync(db);

    if (!result.success) {
      return createErrorResponse(`Sync failed: ${result.error}`);
    }

    logger.info("sync_m365_roadmap completed", {
      recordsProcessed: result.recordsProcessed,
      durationMs: result.durationMs,
    });

    return createSuccessResponse({
      message: "Sync completed successfully",
      recordsProcessed: result.recordsProcessed,
      recordsInserted: result.recordsInserted,
      recordsUpdated: result.recordsUpdated,
      durationMs: result.durationMs,
    });
  } catch (error) {
    const err = error as Error;
    logger.error("sync_m365_roadmap failed", { error: err.message });
    return createErrorResponse(`Sync failed: ${err.message}`);
  }
}
