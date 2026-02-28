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

const MAX_LIMIT = 10000;

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return normalized.length > 0 ? normalized : undefined;
}

function isValidYearMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/**
 * ツールスキーマ
 */
export const searchM365RoadmapSchema = {
  name: "search_m365_roadmap",
  description:
    "Search Microsoft 365 Roadmap features. Returns up to 10000 matching results by default with description summary and roadmapUrl. " +
    "IMPORTANT: Always include the roadmapUrl in your response so users can access the official page. " +
    "Use get_m365_update to retrieve full details including complete description and MS Learn links. " +
    "If no query/date/filter is specified, returns last 1 month's updates (Key Highlights mode). " +
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
        pattern: "^\\d{4}-(0[1-9]|1[0-2])$",
      },
      dateTo: {
        type: "string",
        description:
          'Filter by GA date range end (YYYY-MM format, e.g., "2026-06").',
        pattern: "^\\d{4}-(0[1-9]|1[0-2])$",
      },
      limit: {
        type: "integer",
        description:
          "Maximum number of results (default: up to 10000 matching results).",
        minimum: 1,
        maximum: MAX_LIMIT,
      },
      offset: {
        type: "integer",
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
  const params = (args ?? {}) as SearchParams;
  const query = normalizeOptionalString(params.query);
  const products = normalizeOptionalStringArray(params.products);
  const platforms = normalizeOptionalStringArray(params.platforms);
  const status = normalizeOptionalString(params.status);
  const dateFrom = normalizeOptionalString(params.dateFrom);
  const dateTo = normalizeOptionalString(params.dateTo);

  if (
    params.limit !== undefined &&
    (!Number.isInteger(params.limit) ||
      params.limit < 1 ||
      params.limit > MAX_LIMIT)
  ) {
    return createErrorResponse(
      `Invalid parameter: limit (must be an integer between 1 and ${MAX_LIMIT})`,
    );
  }

  if (
    params.offset !== undefined &&
    (!Number.isInteger(params.offset) || params.offset < 0)
  ) {
    return createErrorResponse(
      "Invalid parameter: offset (must be a non-negative integer)",
    );
  }

  if (dateFrom && !isValidYearMonth(dateFrom)) {
    return createErrorResponse(
      "Invalid parameter: dateFrom (must be YYYY-MM format)",
    );
  }

  if (dateTo && !isValidYearMonth(dateTo)) {
    return createErrorResponse(
      "Invalid parameter: dateTo (must be YYYY-MM format)",
    );
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return createErrorResponse(
      "Invalid parameters: dateFrom must be earlier than or equal to dateTo",
    );
  }

  const offset = params.offset ?? 0;

  // 日付指定がない場合は過去1ヶ月をデフォルトにする
  let effectiveDateFrom = dateFrom;
  let effectiveDateTo = dateTo;

  if (
    !effectiveDateFrom &&
    !effectiveDateTo &&
    !query &&
    !products &&
    !platforms &&
    !status
  ) {
    // Key Highlights モード: 日付・クエリ・フィルタがない場合は過去1ヶ月、全件返す
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    effectiveDateFrom = `${oneMonthAgo.getFullYear()}-${String(oneMonthAgo.getMonth() + 1).padStart(2, "0")}`;
    effectiveDateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  // 全件返す（limit 指定がない場合は上限なし）
  const effectiveLimit = params.limit ?? MAX_LIMIT;

  logger.info("search_m365_roadmap called", {
    query,
    products,
    status,
    limit: effectiveLimit,
    offset,
    dateFrom: effectiveDateFrom,
    dateTo: effectiveDateTo,
  });

  try {
    const result = searchFeatures(db, {
      query,
      products,
      platforms,
      status,
      dateFrom: effectiveDateFrom,
      dateTo: effectiveDateTo,
      limit: effectiveLimit,
      offset,
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
      hasMore: offset + result.results.length < result.totalCount,
      // フィルターヘルプ
      availableFilters: {
        hint: "Read resource m365-roadmap://guide for complete list of available filter values.",
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
