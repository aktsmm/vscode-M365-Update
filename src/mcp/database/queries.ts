/**
 * データベースクエリ
 *
 * M365 Roadmap データの CRUD 操作
 */

import type Database from "better-sqlite3";
import type {
  M365RoadmapFeature,
  M365SearchFilters,
  M365SearchResultItem,
} from "../api/types.js";

// ============================================================
// 同期チェックポイント
// ============================================================

export interface SyncCheckpoint {
  lastSync: string;
  syncStatus: string;
  recordCount: number;
  lastSyncDurationMs: number | null;
  lastError: string | null;
}

/**
 * 同期チェックポイントを取得
 */
export function getSyncCheckpoint(
  db: Database.Database,
): SyncCheckpoint | null {
  const row = db
    .prepare(
      `
        SELECT 
            last_sync as lastSync,
            sync_status as syncStatus,
            record_count as recordCount,
            last_sync_duration_ms as lastSyncDurationMs,
            last_error as lastError
        FROM sync_checkpoint
        WHERE id = 1
    `,
    )
    .get() as SyncCheckpoint | undefined;

  return row ?? null;
}

/**
 * 同期開始（ロック取得）
 */
export function startSync(db: Database.Database): boolean {
  const result = db
    .prepare(
      `
        UPDATE sync_checkpoint
        SET sync_status = 'syncing', updated_at = datetime('now')
        WHERE id = 1 AND sync_status != 'syncing'
    `,
    )
    .run();

  return result.changes > 0;
}

/**
 * 同期成功で完了
 */
export function completeSyncSuccess(
  db: Database.Database,
  lastSync: string,
  recordCount: number,
  durationMs: number,
): void {
  db.prepare(
    `
        UPDATE sync_checkpoint
        SET 
            last_sync = ?,
            sync_status = 'idle',
            record_count = ?,
            last_sync_duration_ms = ?,
            last_error = NULL,
            updated_at = datetime('now')
        WHERE id = 1
    `,
  ).run(lastSync, recordCount, durationMs);
}

/**
 * 同期失敗で完了
 */
export function completeSyncFailure(
  db: Database.Database,
  errorMessage: string,
): void {
  db.prepare(
    `
        UPDATE sync_checkpoint
        SET 
            sync_status = 'idle',
            last_error = ?,
            updated_at = datetime('now')
        WHERE id = 1
    `,
  ).run(errorMessage);
}

// ============================================================
// ETag キャッシュ
// ============================================================

/**
 * 保存された ETag を取得
 */
export function getStoredETag(db: Database.Database): string | null {
  try {
    const row = db.prepare("SELECT etag FROM api_cache WHERE id = 1").get() as
      | { etag: string | null }
      | undefined;
    return row?.etag ?? null;
  } catch {
    // テーブルが存在しない場合（古い DB）
    return null;
  }
}

/**
 * ETag を保存
 */
export function saveETag(db: Database.Database, etag: string): void {
  try {
    db.prepare(
      `
        INSERT INTO api_cache (id, etag, last_checked, updated_at)
        VALUES (1, ?, datetime('now'), datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            etag = excluded.etag,
            last_checked = datetime('now'),
            updated_at = datetime('now')
      `,
    ).run(etag);
  } catch {
    // テーブルが存在しない場合は無視
  }
}

/**
 * 最新の modified 日時を取得
 */
export function getLastModified(db: Database.Database): string | null {
  const row = db
    .prepare("SELECT MAX(modified) as lastModified FROM m365_features")
    .get() as { lastModified: string | null } | undefined;
  return row?.lastModified ?? null;
}

// ============================================================
// フィーチャー CRUD
// ============================================================

/**
 * フィーチャーを UPSERT
 */
export function upsertFeature(
  db: Database.Database,
  feature: M365RoadmapFeature,
): void {
  db.prepare(
    `
        INSERT INTO m365_features (id, title, description, status, general_availability_date, preview_availability_date, created, modified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            status = excluded.status,
            general_availability_date = excluded.general_availability_date,
            preview_availability_date = excluded.preview_availability_date,
            modified = excluded.modified
    `,
  ).run(
    feature.id,
    feature.title,
    feature.description,
    feature.status,
    feature.generalAvailabilityDate,
    feature.previewAvailabilityDate,
    feature.created,
    feature.modified,
  );
}

/**
 * フィーチャーの製品を置換
 */
export function replaceFeatureProducts(
  db: Database.Database,
  featureId: number,
  products: string[],
): void {
  db.prepare("DELETE FROM feature_products WHERE feature_id = ?").run(
    featureId,
  );

  const insert = db.prepare(
    "INSERT INTO feature_products (feature_id, product) VALUES (?, ?)",
  );
  for (const product of products) {
    insert.run(featureId, product);
  }
}

/**
 * フィーチャーのプラットフォームを置換
 */
export function replaceFeaturePlatforms(
  db: Database.Database,
  featureId: number,
  platforms: string[],
): void {
  db.prepare("DELETE FROM feature_platforms WHERE feature_id = ?").run(
    featureId,
  );

  const insert = db.prepare(
    "INSERT INTO feature_platforms (feature_id, platform) VALUES (?, ?)",
  );
  for (const platform of platforms) {
    insert.run(featureId, platform);
  }
}

/**
 * フィーチャーのクラウドインスタンスを置換
 */
export function replaceFeatureCloudInstances(
  db: Database.Database,
  featureId: number,
  instances: string[],
): void {
  db.prepare("DELETE FROM feature_cloud_instances WHERE feature_id = ?").run(
    featureId,
  );

  const insert = db.prepare(
    "INSERT INTO feature_cloud_instances (feature_id, cloud_instance) VALUES (?, ?)",
  );
  for (const instance of instances) {
    insert.run(featureId, instance);
  }
}

/**
 * フィーチャーのリリースリングを置換
 */
export function replaceFeatureReleaseRings(
  db: Database.Database,
  featureId: number,
  rings: string[],
): void {
  db.prepare("DELETE FROM feature_release_rings WHERE feature_id = ?").run(
    featureId,
  );

  const insert = db.prepare(
    "INSERT INTO feature_release_rings (feature_id, release_ring) VALUES (?, ?)",
  );
  for (const ring of rings) {
    insert.run(featureId, ring);
  }
}

/**
 * フィーチャーの可用性を置換
 */
export function replaceFeatureAvailabilities(
  db: Database.Database,
  featureId: number,
  availabilities: { ring: string; year: number; month: string }[],
): void {
  db.prepare("DELETE FROM feature_availabilities WHERE feature_id = ?").run(
    featureId,
  );

  const insert = db.prepare(
    "INSERT INTO feature_availabilities (feature_id, ring, year, month) VALUES (?, ?, ?, ?)",
  );
  for (const avail of availabilities) {
    insert.run(featureId, avail.ring, avail.year, avail.month);
  }
}

/**
 * フィーチャー件数を取得
 */
export function getFeatureCount(db: Database.Database): number {
  const result = db
    .prepare("SELECT COUNT(*) as count FROM m365_features")
    .get() as { count: number };
  return result.count;
}

// ============================================================
// 検索クエリ
// ============================================================

/**
 * フィーチャーを検索
 */
export function searchFeatures(
  db: Database.Database,
  filters: M365SearchFilters,
): { results: M365SearchResultItem[]; totalCount: number } {
  // limit が指定されていない場合は全件返す（-1 = 全件）
  const limit = filters.limit ?? 10000;
  const offset = filters.offset ?? 0;

  let whereClause = "1=1";
  const params: unknown[] = [];

  // FTS 検索
  let useFts = false;
  if (filters.query && filters.query.trim()) {
    useFts = true;
  }

  // ステータスフィルタ
  if (filters.status) {
    whereClause += " AND f.status = ?";
    params.push(filters.status);
  }

  // GA 日付範囲
  if (filters.dateFrom) {
    whereClause += " AND f.general_availability_date >= ?";
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    whereClause += " AND f.general_availability_date <= ?";
    params.push(filters.dateTo);
  }

  // 製品フィルタ
  if (filters.products && filters.products.length > 0) {
    const placeholders = filters.products.map(() => "?").join(", ");
    whereClause += ` AND f.id IN (SELECT feature_id FROM feature_products WHERE product IN (${placeholders}))`;
    params.push(...filters.products);
  }

  // プラットフォームフィルタ
  if (filters.platforms && filters.platforms.length > 0) {
    const placeholders = filters.platforms.map(() => "?").join(", ");
    whereClause += ` AND f.id IN (SELECT feature_id FROM feature_platforms WHERE platform IN (${placeholders}))`;
    params.push(...filters.platforms);
  }

  let sql: string;
  let countSql: string;

  if (useFts) {
    // FTS 検索を使用
    const ftsQuery = filters
      .query!.trim()
      .split(/\s+/)
      .map((w) => `${w}*`)
      .join(" ");

    sql = `
            SELECT 
                f.id,
                f.title,
                f.description,
                f.status,
                f.general_availability_date as generalAvailabilityDate,
                f.preview_availability_date as previewAvailabilityDate,
                f.modified
            FROM m365_features f
            JOIN m365_features_fts fts ON f.id = fts.rowid
            WHERE m365_features_fts MATCH ?
            AND ${whereClause}
            ORDER BY f.modified DESC
            LIMIT ? OFFSET ?
        `;

    countSql = `
            SELECT COUNT(*) as count
            FROM m365_features f
            JOIN m365_features_fts fts ON f.id = fts.rowid
            WHERE m365_features_fts MATCH ?
            AND ${whereClause}
        `;

    params.unshift(ftsQuery);
  } else {
    sql = `
            SELECT 
                f.id,
                f.title,
                f.description,
                f.status,
                f.general_availability_date as generalAvailabilityDate,
                f.preview_availability_date as previewAvailabilityDate,
                f.modified
            FROM m365_features f
            WHERE ${whereClause}
            ORDER BY f.modified DESC
            LIMIT ? OFFSET ?
        `;

    countSql = `
            SELECT COUNT(*) as count
            FROM m365_features f
            WHERE ${whereClause}
        `;
  }

  // 結果取得
  const rows = db.prepare(sql).all(...params, limit, offset) as Array<{
    id: number;
    title: string;
    description: string | null;
    status: string;
    generalAvailabilityDate: string | null;
    previewAvailabilityDate: string | null;
    modified: string;
  }>;

  // 件数取得
  const countResult = db.prepare(countSql).get(...params) as { count: number };

  // 各フィーチャーの製品・プラットフォームを取得
  const results: M365SearchResultItem[] = rows.map((row) => {
    const products = db
      .prepare("SELECT product FROM feature_products WHERE feature_id = ?")
      .all(row.id) as { product: string }[];
    const platforms = db
      .prepare("SELECT platform FROM feature_platforms WHERE feature_id = ?")
      .all(row.id) as { platform: string }[];

    // description の最初の 200 文字をサマリとして返す
    const descriptionSummary = row.description
      ? row.description.length > 200
        ? row.description.substring(0, 200) + "..."
        : row.description
      : null;

    return {
      id: row.id,
      title: row.title,
      description: descriptionSummary,
      status: row.status,
      products: products.map((p) => p.product),
      platforms: platforms.map((p) => p.platform),
      generalAvailabilityDate: row.generalAvailabilityDate,
      previewAvailabilityDate: row.previewAvailabilityDate,
      modified: row.modified,
    };
  });

  return {
    results,
    totalCount: countResult.count,
  };
}

/**
 * ID でフィーチャーを取得
 */
export function getFeatureById(
  db: Database.Database,
  id: number,
): M365RoadmapFeature | null {
  const row = db
    .prepare(
      `
        SELECT 
            id,
            title,
            description,
            status,
            general_availability_date as generalAvailabilityDate,
            preview_availability_date as previewAvailabilityDate,
            created,
            modified
        FROM m365_features
        WHERE id = ?
    `,
    )
    .get(id) as
    | {
        id: number;
        title: string;
        description: string | null;
        status: string;
        generalAvailabilityDate: string | null;
        previewAvailabilityDate: string | null;
        created: string;
        modified: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  // 関連データ取得
  const products = db
    .prepare("SELECT product FROM feature_products WHERE feature_id = ?")
    .all(id) as { product: string }[];
  const platforms = db
    .prepare("SELECT platform FROM feature_platforms WHERE feature_id = ?")
    .all(id) as { platform: string }[];
  const cloudInstances = db
    .prepare(
      "SELECT cloud_instance FROM feature_cloud_instances WHERE feature_id = ?",
    )
    .all(id) as { cloud_instance: string }[];
  const releaseRings = db
    .prepare(
      "SELECT release_ring FROM feature_release_rings WHERE feature_id = ?",
    )
    .all(id) as { release_ring: string }[];
  const availabilities = db
    .prepare(
      "SELECT ring, year, month FROM feature_availabilities WHERE feature_id = ?",
    )
    .all(id) as { ring: string; year: number; month: string }[];

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    generalAvailabilityDate: row.generalAvailabilityDate,
    previewAvailabilityDate: row.previewAvailabilityDate,
    created: row.created,
    modified: row.modified,
    products: products.map((p) => p.product),
    platforms: platforms.map((p) => p.platform),
    cloudInstances: cloudInstances.map((c) => c.cloud_instance),
    releaseRings: releaseRings.map((r) => r.release_ring),
    availabilities,
  };
}

// ============================================================
// メタデータ取得
// ============================================================

/**
 * 全製品一覧を取得
 */
export function getAllProducts(db: Database.Database): string[] {
  const rows = db
    .prepare("SELECT DISTINCT product FROM feature_products ORDER BY product")
    .all() as { product: string }[];
  return rows.map((r) => r.product);
}

/**
 * 全プラットフォーム一覧を取得
 */
export function getAllPlatforms(db: Database.Database): string[] {
  const rows = db
    .prepare(
      "SELECT DISTINCT platform FROM feature_platforms ORDER BY platform",
    )
    .all() as { platform: string }[];
  return rows.map((r) => r.platform);
}

/**
 * 全ステータス一覧を取得
 */
export function getAllStatuses(db: Database.Database): string[] {
  const rows = db
    .prepare("SELECT DISTINCT status FROM m365_features ORDER BY status")
    .all() as { status: string }[];
  return rows.map((r) => r.status);
}
