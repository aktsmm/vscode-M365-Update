/**
 * search_m365_roadmap ツール
 *
 * M365 Roadmap を検索（軽量メタデータ返却）
 */

import type Database from "better-sqlite3";
import {
  searchFeatures,
  getAllProducts,
  getAllPlatforms,
  getAllStatuses,
} from "../database/queries.js";
import {
  createSuccessResponse,
  createErrorResponse,
  type ToolResponse,
} from "../types.js";
import * as logger from "../utils/logger.js";

/**
 * 検索パラメータ
 */
interface SearchParams {
  query?: string;
  products?: string[];
  platforms?: string[];
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * ツールスキーマ
 */
export const searchM365RoadmapSchema = {
  name: "search_m365_roadmap",
  description:
    "Search Microsoft 365 Roadmap features. Returns ALL matching results by default with description summary and roadmapUrl. " +
    "IMPORTANT: Always include the roadmapUrl in your response so users can access the official page. " +
    "Use get_m365_update to retrieve full details including complete description and MS Learn links. " +
    "If no date is specified, returns last 1 month's updates. " +
    "Respond in the same language as the user's query (e.g., Japanese if asked in Japanese).",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Full-text search query (searches title and description). " +
          'Use keywords like "Copilot", "Teams", "SharePoint". Case-insensitive.',
      },
      products: {
        type: "array",
        items: { type: "string" },
        description:
          'Filter by products (e.g., ["Microsoft Teams", "Microsoft Copilot (Microsoft 365)"]). ' +
          "Use OR logic - matches features containing ANY of the specified products.",
      },
      platforms: {
        type: "array",
        items: { type: "string" },
        description:
          'Filter by platforms (e.g., ["Web", "Desktop", "iOS", "Android"]). ' +
          "Use OR logic.",
      },
      status: {
        type: "string",
        description:
          'Filter by status. Common values: "In development", "Rolling out", "Launched".',
      },
      dateFrom: {
        type: "string",
        description:
          'Filter by GA date range start (YYYY-MM format, e.g., "2026-01").',
      },
      dateTo: {
        type: "string",
        description:
          'Filter by GA date range end (YYYY-MM format, e.g., "2026-06").',
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 15). Set higher to get more results.",
      },
      offset: {
        type: "number",
        description: "Number of results to skip for pagination (default: 0).",
        minimum: 0,
      },
    },
  },
};

/**
 * 検索ツールのハンドラ
 */
export function handleSearchM365Roadmap(
  db: Database.Database,
  args: unknown,
): ToolResponse {
  const params = (args || {}) as SearchParams;

  // 日付指定がない場合は過去1ヶ月をデフォルトにする
  let dateFrom = params.dateFrom;
  let dateTo = params.dateTo;
  
  if (!dateFrom && !dateTo && !params.query && !params.products && !params.platforms && !params.status) {
    // Key Highlights モード: 日付・クエリ・フィルタがない場合は過去1ヶ月、全件返す
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    dateFrom = `${oneMonthAgo.getFullYear()}-${String(oneMonthAgo.getMonth() + 1).padStart(2, "0")}`;
    dateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  // 全件返す（limit 指定がない場合は上限なし）
  const effectiveLimit = params.limit ?? 10000;

  logger.info("search_m365_roadmap called", {
    query: params.query,
    products: params.products,
    status: params.status,
    limit: effectiveLimit,
    dateFrom,
    dateTo,
  });

  try {
    const result = searchFeatures(db, {
      query: params.query,
      products: params.products,
      platforms: params.platforms,
      status: params.status,
      dateFrom: dateFrom,
      dateTo: dateTo,
      limit: effectiveLimit,
      offset: params.offset,
    });

    logger.info("search_m365_roadmap completed", {
      resultCount: result.results.length,
      totalCount: result.totalCount,
    });

    // 各結果に参考 URL を追加
    const resultsWithUrls = result.results.map((item) => ({
      ...item,
      roadmapUrl: `https://www.microsoft.com/ja-jp/microsoft-365/roadmap?filters=&searchterms=${item.id}`,
    }));

    return createSuccessResponse({
      results: resultsWithUrls,
      totalCount: result.totalCount,
      hasMore: result.results.length < result.totalCount,
      // フィルターヘルプ
      availableFilters: {
        hint: "Use get_m365_guide resource for complete list of available filter values.",
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error("search_m365_roadmap failed", { error: err.message });
    return createErrorResponse(`Search failed: ${err.message}`);
  }
}

/**
 * ガイドリソースのデータを取得
 */
export function getGuideData(db: Database.Database): {
  products: string[];
  platforms: string[];
  statuses: string[];
} {
  return {
    products: getAllProducts(db),
    platforms: getAllPlatforms(db),
    statuses: getAllStatuses(db),
  };
}
