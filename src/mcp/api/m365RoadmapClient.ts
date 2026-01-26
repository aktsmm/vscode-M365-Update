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

/**
 * フェッチオプション
 */
export interface FetchOptions {
  /** タイムアウト（ミリ秒） */
  timeoutMs?: number;
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
): Promise<Response> {
  const { timeoutMs = 30000 } = options;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "M365-Update-MCP-Server/0.1.0",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
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
 * M365 Roadmap の全フィーチャーを取得
 *
 * @returns フィーチャーの配列
 */
export async function fetchAllFeatures(): Promise<M365RoadmapFeature[]> {
  logger.info("Fetching M365 Roadmap features", { url: M365_ROADMAP_API_URL });

  const startTime = Date.now();

  const response = await fetchWithRetry(M365_ROADMAP_API_URL);
  const data = (await response.json()) as M365ApiResponse;

  // OData 形式のレスポンスから value 配列を取得
  const features = data.value || [];

  const durationMs = Date.now() - startTime;

  logger.info("Fetched M365 Roadmap features", {
    count: features.length,
    durationMs,
  });

  return features;
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
