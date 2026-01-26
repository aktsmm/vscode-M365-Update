/**
 * 同期サービス
 *
 * M365 Roadmap API からデータを取得し、ローカル SQLite に同期
 * ETag を使った条件付きリクエストで高速化
 */

import type Database from "better-sqlite3";
import type { M365RoadmapFeature } from "../api/types.js";
import {
  fetchAllFeaturesWithETag,
  setCachedETag,
} from "../api/m365RoadmapClient.js";
import {
  getSyncCheckpoint,
  startSync,
  completeSyncSuccess,
  completeSyncFailure,
  upsertFeature,
  replaceFeatureProducts,
  replaceFeaturePlatforms,
  replaceFeatureCloudInstances,
  replaceFeatureReleaseRings,
  replaceFeatureAvailabilities,
  getFeatureCount,
  getLastModified,
  getStoredETag,
  saveETag,
} from "../database/queries.js";
import * as logger from "../utils/logger.js";

/**
 * 同期結果
 */
export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  durationMs: number;
  error?: string;
}

/**
 * 同期失敗結果を作成
 */
function createSyncFailureResult(startTime: number, error: string): SyncResult {
  return {
    success: false,
    recordsProcessed: 0,
    recordsInserted: 0,
    recordsUpdated: 0,
    durationMs: Date.now() - startTime,
    error,
  };
}

/**
 * M365 Roadmap データを同期（ETag 対応で高速化）
 *
 * @param db データベースインスタンス
 * @param force 強制同期（ETag キャッシュを無視）
 * @returns 同期結果
 */
export async function performSync(
  db: Database.Database,
  force: boolean = false,
): Promise<SyncResult> {
  const startTime = Date.now();

  logger.info("Starting M365 Roadmap sync", { force });

  // 同期ロック取得
  const lockAcquired = startSync(db);
  if (!lockAcquired) {
    logger.warn("Sync already in progress, skipping");
    return createSyncFailureResult(startTime, "Sync already in progress");
  }

  try {
    const checkpoint = getSyncCheckpoint(db);
    const recordCountBefore = getFeatureCount(db);

    // 保存された ETag をメモリに復元
    const storedETag = getStoredETag(db);
    if (storedETag && !force) {
      setCachedETag(storedETag);
    }

    logger.info("Sync checkpoint", {
      lastSync: checkpoint?.lastSync,
      recordCountBefore,
      storedETag: storedETag ? "exists" : "none",
    });

    // API からフィーチャー取得（ETag 対応）
    const fetchResult = await fetchAllFeaturesWithETag(!force);

    // 304 Not Modified - データ変更なし
    if (!fetchResult.modified) {
      const durationMs = Date.now() - startTime;
      completeSyncSuccess(
        db,
        new Date().toISOString(),
        recordCountBefore,
        durationMs,
      );
      logger.info("Sync completed - no changes (304 Not Modified)", {
        durationMs,
      });

      return {
        success: true,
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        durationMs,
      };
    }

    const features = fetchResult.features;

    if (features.length === 0) {
      const durationMs = Date.now() - startTime;
      completeSyncSuccess(
        db,
        new Date().toISOString(),
        recordCountBefore,
        durationMs,
      );
      logger.info("Sync completed - no features found", { durationMs });

      return {
        success: true,
        recordsProcessed: 0,
        recordsInserted: 0,
        recordsUpdated: 0,
        durationMs,
      };
    }

    // 差分同期: modified 日時で変更分のみ更新
    const lastModified = getLastModified(db);
    const featuresToSync = lastModified
      ? features.filter((f) => f.modified > lastModified)
      : features;

    logger.info("Differential sync", {
      totalFeatures: features.length,
      changedFeatures: featuresToSync.length,
      lastModified,
    });

    // トランザクションで同期
    const result =
      featuresToSync.length > 0
        ? syncFeaturesInTransaction(db, featuresToSync)
        : { recordsProcessed: 0 };

    const recordCountAfter = getFeatureCount(db);

    // ETag を保存
    if (fetchResult.etag) {
      saveETag(db, fetchResult.etag);
    }

    // 最新の modified を取得
    const latestModified = features.reduce((latest, f) => {
      return f.modified > latest ? f.modified : latest;
    }, checkpoint?.lastSync || "1970-01-01T00:00:00.000Z");

    const durationMs = Date.now() - startTime;
    completeSyncSuccess(db, latestModified, recordCountAfter, durationMs);

    const recordsInserted = Math.max(0, recordCountAfter - recordCountBefore);
    const recordsUpdated = result.recordsProcessed - recordsInserted;

    logger.info("Sync completed successfully", {
      recordsProcessed: result.recordsProcessed,
      recordsInserted,
      recordsUpdated,
      totalRecords: recordCountAfter,
      durationMs,
    });

    return {
      success: true,
      recordsProcessed: result.recordsProcessed,
      recordsInserted,
      recordsUpdated,
      durationMs,
    };
  } catch (error) {
    const err = error as Error;
    const durationMs = Date.now() - startTime;

    completeSyncFailure(db, err.message);
    logger.errorWithStack("Sync failed", err, { durationMs });

    return createSyncFailureResult(startTime, err.message);
  }
}

/**
 * トランザクション内でフィーチャーを同期
 */
function syncFeaturesInTransaction(
  db: Database.Database,
  features: M365RoadmapFeature[],
): { recordsProcessed: number } {
  const syncTransaction = db.transaction(
    (featuresToSync: M365RoadmapFeature[]) => {
      let processed = 0;

      for (const feature of featuresToSync) {
        try {
          // メインレコード UPSERT
          upsertFeature(db, feature);

          // 関連データ置換
          replaceFeatureProducts(db, feature.id, feature.products || []);
          replaceFeaturePlatforms(db, feature.id, feature.platforms || []);
          replaceFeatureCloudInstances(
            db,
            feature.id,
            feature.cloudInstances || [],
          );
          replaceFeatureReleaseRings(
            db,
            feature.id,
            feature.releaseRings || [],
          );
          replaceFeatureAvailabilities(
            db,
            feature.id,
            feature.availabilities || [],
          );

          processed++;

          // 進捗ログ（100件ごと）
          if (processed % 100 === 0) {
            logger.debug("Sync progress", {
              processed,
              total: featuresToSync.length,
            });
          }
        } catch (error) {
          const err = error as Error;
          logger.warn("Failed to sync feature", {
            featureId: feature.id,
            error: err.message,
          });
          throw new Error(
            `Failed to sync feature ${feature.id}: ${err.message}`,
          );
        }
      }

      return processed;
    },
  );

  const processed = syncTransaction(features);
  return { recordsProcessed: processed };
}

/**
 * 同期が必要か判定
 *
 * @param db データベースインスタンス
 * @param stalenessHours 古さの閾値（時間）
 * @returns 同期が必要なら true
 */
export function isSyncNeeded(
  db: Database.Database,
  stalenessHours: number,
): boolean {
  const checkpoint = getSyncCheckpoint(db);

  if (!checkpoint || checkpoint.lastSync === "1970-01-01T00:00:00.000Z") {
    return true;
  }

  const lastSyncTime = new Date(checkpoint.lastSync).getTime();
  const now = Date.now();
  const hoursSinceSync = (now - lastSyncTime) / (1000 * 60 * 60);

  return hoursSinceSync >= stalenessHours;
}

/**
 * 同期ステータスを取得
 */
export function getSyncStatus(db: Database.Database): {
  lastSync: string;
  syncStatus: string;
  recordCount: number;
  hoursSinceSync: number;
} | null {
  const checkpoint = getSyncCheckpoint(db);

  if (!checkpoint) {
    return null;
  }

  const lastSyncTime = new Date(checkpoint.lastSync).getTime();
  const now = Date.now();
  const hoursSinceSync = (now - lastSyncTime) / (1000 * 60 * 60);

  return {
    lastSync: checkpoint.lastSync,
    syncStatus: checkpoint.syncStatus,
    recordCount: checkpoint.recordCount,
    hoursSinceSync: Math.round(hoursSinceSync * 10) / 10,
  };
}
