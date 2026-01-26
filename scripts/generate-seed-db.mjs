#!/usr/bin/env node
/**
 * Seed データベース生成スクリプト
 *
 * パッケージ公開時に M365 Roadmap API からデータを取得し、
 * resources/seed.db として同梱用データベースを生成する
 */

import Database from "better-sqlite3";
import { readFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = "https://www.microsoft.com/releasecommunications/api/v2/m365";

/**
 * API から全データを取得
 */
async function fetchAllFeatures() {
  console.log("Fetching M365 Roadmap data from API...");

  const response = await fetch(API_URL, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "M365-Update-MCP-Server/0.3.0",
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  
  // OData 形式のレスポンスから value 配列を取得
  const features = data.value || [];
  
  console.log(`  Total features fetched: ${features.length}`);
  return features;
}

/**
 * データベースを初期化
 */
function initializeDatabase(dbPath) {
  const db = new Database(dbPath);

  // パフォーマンス最適化
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("cache_size = -64000");
  db.pragma("temp_store = MEMORY");
  db.pragma("foreign_keys = ON");

  // スキーマ適用
  const schemaPath = join(__dirname, "..", "src", "mcp", "database", "schema.sql");
  const schemaSql = readFileSync(schemaPath, "utf-8");
  db.exec(schemaSql);

  return db;
}

/**
 * フィーチャーをデータベースに挿入
 */
function insertFeatures(db, features) {
  // プリペアドステートメント（スキーマに合わせたカラム名）
  const upsertFeature = db.prepare(`
    INSERT OR REPLACE INTO m365_features (
      id, title, description, status, general_availability_date,
      preview_availability_date, created, modified
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteProducts = db.prepare("DELETE FROM feature_products WHERE feature_id = ?");
  const insertProduct = db.prepare("INSERT INTO feature_products (feature_id, product) VALUES (?, ?)");

  const deletePlatforms = db.prepare("DELETE FROM feature_platforms WHERE feature_id = ?");
  const insertPlatform = db.prepare("INSERT INTO feature_platforms (feature_id, platform) VALUES (?, ?)");

  const deleteCloudInstances = db.prepare("DELETE FROM feature_cloud_instances WHERE feature_id = ?");
  const insertCloudInstance = db.prepare("INSERT INTO feature_cloud_instances (feature_id, cloud_instance) VALUES (?, ?)");

  const deleteReleaseRings = db.prepare("DELETE FROM feature_release_rings WHERE feature_id = ?");
  const insertReleaseRing = db.prepare("INSERT INTO feature_release_rings (feature_id, release_ring) VALUES (?, ?)");

  const deleteAvailabilities = db.prepare("DELETE FROM feature_availabilities WHERE feature_id = ?");
  const insertAvailability = db.prepare(`
    INSERT INTO feature_availabilities (feature_id, ring, year, month)
    VALUES (?, ?, ?, ?)
  `);

  // FTS更新
  const deleteFts = db.prepare("DELETE FROM m365_features_fts WHERE rowid = ?");
  const insertFts = db.prepare(`
    INSERT INTO m365_features_fts (rowid, title, description)
    VALUES (?, ?, ?)
  `);

  // トランザクションで一括処理
  const insertAll = db.transaction((features) => {
    for (const feature of features) {
      // API フィールド名は小文字
      const featureId = feature.id;
      const title = feature.title || "";
      const description = feature.description || "";
      const status = feature.status || "";
      const previewDate = feature.previewAvailabilityDate || null;
      const gaDate = feature.generalAvailabilityDate || null;
      const createdAt = feature.created || "";
      const modifiedAt = feature.modified || "";

      // メインテーブル
      upsertFeature.run(
        featureId, title, description, status, gaDate,
        previewDate, createdAt, modifiedAt
      );

      // Products
      deleteProducts.run(featureId);
      const products = feature.products || [];
      for (const product of products) {
        insertProduct.run(featureId, product);
      }

      // Platforms
      deletePlatforms.run(featureId);
      const platforms = feature.platforms || [];
      for (const platform of platforms) {
        insertPlatform.run(featureId, platform);
      }

      // Cloud Instances
      deleteCloudInstances.run(featureId);
      const cloudInstances = feature.cloudInstances || [];
      for (const cloudInstance of cloudInstances) {
        insertCloudInstance.run(featureId, cloudInstance);
      }

      // Release Rings
      deleteReleaseRings.run(featureId);
      const releaseRings = feature.releaseRings || [];
      for (const ring of releaseRings) {
        insertReleaseRing.run(featureId, ring);
      }

      // Availabilities
      deleteAvailabilities.run(featureId);
      const availabilities = feature.availabilities || [];
      for (const avail of availabilities) {
        // availabilities は {ring, year, month} 形式
        insertAvailability.run(featureId, avail.ring || "", avail.year || 0, avail.month || "");
      }

      // FTS 更新
      deleteFts.run(featureId);
      insertFts.run(featureId, title, description);
    }
  });

  insertAll(features);
}

/**
 * 同期チェックポイント更新
 */
function updateSyncCheckpoint(db, featureCount) {
  db.prepare(`
    INSERT OR REPLACE INTO sync_checkpoint (id, last_sync, record_count)
    VALUES (1, ?, ?)
  `).run(new Date().toISOString(), featureCount);
}

/**
 * メイン処理
 */
async function main() {
  const projectRoot = join(__dirname, "..");
  const resourcesDir = join(projectRoot, "resources");
  const tempDbPath = join(projectRoot, "temp-seed.db");
  const seedDbPath = join(resourcesDir, "seed.db");

  // resources ディレクトリ確保
  if (!existsSync(resourcesDir)) {
    mkdirSync(resourcesDir, { recursive: true });
  }

  // 既存の一時ファイル削除
  if (existsSync(tempDbPath)) {
    unlinkSync(tempDbPath);
  }
  if (existsSync(tempDbPath + "-wal")) {
    unlinkSync(tempDbPath + "-wal");
  }
  if (existsSync(tempDbPath + "-shm")) {
    unlinkSync(tempDbPath + "-shm");
  }

  console.log("=== Generating Seed Database ===");
  console.log(`Output: ${seedDbPath}`);

  try {
    // API からデータ取得
    const features = await fetchAllFeatures();

    if (features.length === 0) {
      throw new Error("No features fetched from API");
    }

    // データベース初期化
    console.log("Initializing database...");
    const db = initializeDatabase(tempDbPath);

    // データ挿入
    console.log("Inserting features into database...");
    insertFeatures(db, features);

    // チェックポイント更新
    updateSyncCheckpoint(db, features.length);

    // WAL をチェックポイント
    db.pragma("wal_checkpoint(TRUNCATE)");

    // データベースクローズ
    db.close();

    // WAL ファイル削除（単一ファイルにするため）
    if (existsSync(tempDbPath + "-wal")) {
      unlinkSync(tempDbPath + "-wal");
    }
    if (existsSync(tempDbPath + "-shm")) {
      unlinkSync(tempDbPath + "-shm");
    }

    // 最終ファイルにコピー
    copyFileSync(tempDbPath, seedDbPath);
    unlinkSync(tempDbPath);

    // 統計表示
    const stats = {
      features: features.length,
      fileSizeKB: Math.round(statSync(seedDbPath).size / 1024),
    };
    console.log("=== Seed Database Generated ===");
    console.log(`  Features: ${stats.features}`);
    console.log(`  File size: ${stats.fileSizeKB} KB`);
    console.log(`  Output: ${seedDbPath}`);
  } catch (error) {
    console.error("Failed to generate seed database:", error);
    process.exit(1);
  }
}

main();
