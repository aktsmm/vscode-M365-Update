-- M365 Roadmap データベーススキーマ
-- SQLite with FTS5 for full-text search

-- スキーマバージョン管理
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 初期バージョン挿入
INSERT OR IGNORE INTO schema_version (version) VALUES (1);

-- 同期チェックポイント
CREATE TABLE IF NOT EXISTS sync_checkpoint (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'idle',
    record_count INTEGER NOT NULL DEFAULT 0,
    last_sync_duration_ms INTEGER,
    last_error TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 初期チェックポイント
INSERT OR IGNORE INTO sync_checkpoint (id, last_sync, sync_status, record_count)
VALUES (1, '1970-01-01T00:00:00.000Z', 'idle', 0);

-- M365 Roadmap フィーチャー
CREATE TABLE IF NOT EXISTS m365_features (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    general_availability_date TEXT,
    preview_availability_date TEXT,
    created TEXT NOT NULL,
    modified TEXT NOT NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_m365_features_status ON m365_features(status);
CREATE INDEX IF NOT EXISTS idx_m365_features_modified ON m365_features(modified);
CREATE INDEX IF NOT EXISTS idx_m365_features_ga_date ON m365_features(general_availability_date);

-- 製品テーブル（多対多）
CREATE TABLE IF NOT EXISTS feature_products (
    feature_id INTEGER NOT NULL,
    product TEXT NOT NULL,
    PRIMARY KEY (feature_id, product),
    FOREIGN KEY (feature_id) REFERENCES m365_features(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_products_product ON feature_products(product);

-- プラットフォームテーブル（多対多）
CREATE TABLE IF NOT EXISTS feature_platforms (
    feature_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    PRIMARY KEY (feature_id, platform),
    FOREIGN KEY (feature_id) REFERENCES m365_features(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_platforms_platform ON feature_platforms(platform);

-- クラウドインスタンステーブル（多対多）
CREATE TABLE IF NOT EXISTS feature_cloud_instances (
    feature_id INTEGER NOT NULL,
    cloud_instance TEXT NOT NULL,
    PRIMARY KEY (feature_id, cloud_instance),
    FOREIGN KEY (feature_id) REFERENCES m365_features(id) ON DELETE CASCADE
);

-- リリースリングテーブル（多対多）
CREATE TABLE IF NOT EXISTS feature_release_rings (
    feature_id INTEGER NOT NULL,
    release_ring TEXT NOT NULL,
    PRIMARY KEY (feature_id, release_ring),
    FOREIGN KEY (feature_id) REFERENCES m365_features(id) ON DELETE CASCADE
);

-- 可用性詳細テーブル
CREATE TABLE IF NOT EXISTS feature_availabilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_id INTEGER NOT NULL,
    ring TEXT NOT NULL,
    year INTEGER NOT NULL,
    month TEXT NOT NULL,
    FOREIGN KEY (feature_id) REFERENCES m365_features(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_availabilities_feature ON feature_availabilities(feature_id);

-- FTS5 全文検索インデックス
CREATE VIRTUAL TABLE IF NOT EXISTS m365_features_fts USING fts5(
    title,
    description,
    content='m365_features',
    content_rowid='id'
);

-- FTS トリガー: INSERT
CREATE TRIGGER IF NOT EXISTS m365_features_ai AFTER INSERT ON m365_features BEGIN
    INSERT INTO m365_features_fts(rowid, title, description)
    VALUES (new.id, new.title, new.description);
END;

-- FTS トリガー: UPDATE
CREATE TRIGGER IF NOT EXISTS m365_features_au AFTER UPDATE ON m365_features BEGIN
    INSERT INTO m365_features_fts(m365_features_fts, rowid, title, description)
    VALUES ('delete', old.id, old.title, old.description);
    INSERT INTO m365_features_fts(rowid, title, description)
    VALUES (new.id, new.title, new.description);
END;

-- FTS トリガー: DELETE
CREATE TRIGGER IF NOT EXISTS m365_features_ad AFTER DELETE ON m365_features BEGIN
    INSERT INTO m365_features_fts(m365_features_fts, rowid, title, description)
    VALUES ('delete', old.id, old.title, old.description);
END;
