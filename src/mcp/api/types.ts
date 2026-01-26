/**
 * M365 Roadmap API の型定義
 *
 * API エンドポイント: https://www.microsoft.com/releasecommunications/api/v2/m365
 */

/**
 * M365 Roadmap API からのレスポンス（単一フィーチャー）
 */
export interface M365RoadmapFeature {
  /** フィーチャーの一意識別子 */
  id: number;

  /** フィーチャーのタイトル */
  title: string;

  /** フィーチャーの詳細説明（HTML または プレーンテキスト） */
  description: string | null;

  /** クラウドインスタンス（例: "Worldwide (Standard Multi-Tenant)"） */
  cloudInstances: string[];

  /** 対応プラットフォーム（例: "Web", "Desktop", "iOS", "Android"） */
  platforms: string[];

  /** リリースリング（例: "General Availability", "Preview"） */
  releaseRings: string[];

  /** 対象製品（例: "Teams", "Microsoft Copilot (Microsoft 365)"） */
  products: string[];

  /** GA 予定日（例: "2026-02"） */
  generalAvailabilityDate: string | null;

  /** プレビュー予定日（例: "2026-01"） */
  previewAvailabilityDate: string | null;

  /** ステータス（例: "In development", "Rolling out", "Launched"） */
  status: string;

  /** 作成日時（ISO 8601） */
  created: string;

  /** 更新日時（ISO 8601） */
  modified: string;

  /** リリース可用性の詳細 */
  availabilities: M365Availability[];
}

/**
 * リリース可用性の詳細
 */
export interface M365Availability {
  /** リリースリング */
  ring: string;

  /** リリース年 */
  year: number;

  /** リリース月（例: "February"） */
  month: string;
}

/**
 * 検索フィルタ
 */
export interface M365SearchFilters {
  /** 検索キーワード（タイトル、説明） */
  query?: string;

  /** 製品フィルタ */
  products?: string[];

  /** ステータスフィルタ */
  status?: string;

  /** プラットフォームフィルタ */
  platforms?: string[];

  /** クラウドインスタンスフィルタ */
  cloudInstances?: string[];

  /** GA 日付範囲（開始） YYYY-MM 形式 */
  dateFrom?: string;

  /** GA 日付範囲（終了） YYYY-MM 形式 */
  dateTo?: string;

  /** 最大件数 */
  limit?: number;

  /** オフセット（ページング用） */
  offset?: number;
}

/**
 * 検索結果（軽量メタデータ）
 */
export interface M365SearchResultItem {
  id: number;
  title: string;
  status: string;
  products: string[];
  platforms: string[];
  generalAvailabilityDate: string | null;
  previewAvailabilityDate: string | null;
  modified: string;
}

/**
 * 検索結果レスポンス
 */
export interface M365SearchResult {
  results: M365SearchResultItem[];
  totalCount: number;
  hasMore: boolean;
}
