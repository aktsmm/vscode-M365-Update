/**
 * M365 Roadmap API クライアント
 *
 * Microsoft 365 Roadmap の公開 JSON API にアクセスするクライアント
 * エンドポイント: https://www.microsoft.com/releasecommunications/api/v2/m365
 */

import type { M365RoadmapFeature } from "./types.js";
import * as logger from "../utils/logger.js";

/** API エンドポイント */
const M365_ROADMAP_API_URL =
  "https://www.microsoft.com/releasecommunications/api/v2/m365";

/** リトライ設定 */
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/** キャッシュされた ETag */
let cachedETag: string | null = null;

/**
 * フェッチオプション
 */
export interface FetchOptions {
  /** タイムアウト（ミリ秒） */
  timeoutMs?: number;
  /** 条件付きリクエスト用 ETag */
  ifNoneMatch?: string;
}

/**
 * フェッチ結果
 */
export interface FetchResult {
  /** データが更新されたか */
  modified: boolean;
  /** フィーチャー配列（未更新の場合は空） */
  features: M365RoadmapFeature[];
  /** 新しい ETag */
  etag: string | null;
}

/**
 * 指数バックオフでスリープ
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * リトライ付きフェッチ
 */
async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
): Promise<{ response: Response; notModified: boolean }> {
  const { timeoutMs = 30000, ifNoneMatch } = options;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "M365-Update-MCP-Server/0.3.0",
      };

      // 条件付きリクエスト（ETag）
      if (ifNoneMatch) {
        headers["If-None-Match"] = ifNoneMatch;
      }

      const response = await fetch(url, {
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      // 304 Not Modified = データ変更なし
      if (response.status === 304) {
        return { response, notModified: true };
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return { response, notModified: false };
    } catch (error) {
      const err = error as Error;

      if (attempt === MAX_RETRIES) {
        logger.error("Fetch failed after max retries", {
          url,
          attempts: attempt,
          error: err.message,
        });
        throw err;
      }

      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn("Fetch failed, retrying", {
        url,
        attempt,
        nextRetryMs: delay,
        error: err.message,
      });

      await sleep(delay);
    }
  }

  throw new Error("Unreachable");
}

/**
 * API レスポンス（OData 形式）
 */
interface M365ApiResponse {
  "@odata.context"?: string;
  value: M365RoadmapFeature[];
}

/**
 * M365 Roadmap の全フィーチャーを取得（ETag 対応）
 *
 * @param useCache ETag キャッシュを使用するか
 * @returns フェッチ結果
 */
export async function fetchAllFeaturesWithETag(
  useCache: boolean = true,
): Promise<FetchResult> {
  logger.info("Fetching M365 Roadmap features", {
    url: M365_ROADMAP_API_URL,
    cachedETag: useCache ? cachedETag : null,
  });

  const startTime = Date.now();

  const { response, notModified } = await fetchWithRetry(M365_ROADMAP_API_URL, {
    ifNoneMatch: useCache ? (cachedETag ?? undefined) : undefined,
  });

  // 304 Not Modified - データ変更なし
  if (notModified) {
    const durationMs = Date.now() - startTime;
    logger.info("M365 Roadmap not modified (304)", { durationMs });
    return {
      modified: false,
      features: [],
      etag: cachedETag,
    };
  }

  const data = (await response.json()) as M365ApiResponse;

  // OData 形式のレスポンスから value 配列を取得
  const features = data.value || [];

  // ETag を保存
  const newETag = response.headers.get("ETag");
  if (newETag) {
    cachedETag = newETag;
  }

  const durationMs = Date.now() - startTime;

  logger.info("Fetched M365 Roadmap features", {
    count: features.length,
    durationMs,
    etag: newETag,
  });

  return {
    modified: true,
    features,
    etag: newETag,
  };
}

/**
 * M365 Roadmap の全フィーチャーを取得（後方互換）
 *
 * @returns フィーチャーの配列
 */
export async function fetchAllFeatures(): Promise<M365RoadmapFeature[]> {
  const result = await fetchAllFeaturesWithETag(false);
  return result.features;
}

/**
 * キャッシュされた ETag を設定
 */
export function setCachedETag(etag: string | null): void {
  cachedETag = etag;
}

/**
 * キャッシュされた ETag を取得
 */
export function getCachedETag(): string | null {
  return cachedETag;
}

/**
 * 特定の ID のフィーチャーを取得（全件から検索）
 *
 * 注意: API は個別取得エンドポイントを提供していないため、
 * ローカルキャッシュからの取得を推奨
 *
 * @param id フィーチャー ID
 * @returns フィーチャー or null
 */
export async function fetchFeatureById(
  id: number,
): Promise<M365RoadmapFeature | null> {
  const features = await fetchAllFeatures();
  return features.find((f) => f.id === id) ?? null;
}
