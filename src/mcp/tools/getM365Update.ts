/**
 * get_m365_update ツール
 *
 * M365 Roadmap の詳細を取得
 */

import type Database from "better-sqlite3";
import { getFeatureById } from "../database/queries.js";
import {
  createSuccessResponse,
  createErrorResponse,
  type ToolResponse,
} from "../types.js";
import * as logger from "../utils/logger.js";

/**
 * M365 Roadmap の参考 URL を生成
 */
function generateReferenceUrls(id: number): {
  roadmapUrl: string;
  roadmapUrlJa: string;
  learnSearchUrl: string;
  learnSearchUrlJa: string;
} {
  return {
    roadmapUrl: `https://www.microsoft.com/en-us/microsoft-365/roadmap?filters=&searchterms=${id}`,
    roadmapUrlJa: `https://www.microsoft.com/ja-jp/microsoft-365/roadmap?filters=&searchterms=${id}`,
    learnSearchUrl: `https://learn.microsoft.com/en-us/search/?terms=${id}`,
    learnSearchUrlJa: `https://learn.microsoft.com/ja-jp/search/?terms=${id}`,
  };
}

/**
 * ツールスキーマ
 */
export const getM365UpdateSchema = {
  name: "get_m365_update",
  description:
    "Retrieve complete details of a specific M365 Roadmap feature by ID. " +
    "Includes full description, platforms, cloud instances, availability details, and reference URLs. " +
    "Use after search_m365_roadmap to get detailed content. " +
    "Respond in the same language as the user's query (e.g., Japanese if asked in Japanese).",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "integer",
        description:
          "Unique identifier of the M365 Roadmap feature (required, positive integer).",
      },
    },
    required: ["id"],
  },
};

/**
 * 詳細取得ツールのハンドラ
 */
export function handleGetM365Update(
  db: Database.Database,
  args: unknown,
): ToolResponse {
  const params = (args ?? {}) as { id?: number };

  if (
    typeof params.id !== "number" ||
    !Number.isInteger(params.id) ||
    params.id <= 0
  ) {
    return createErrorResponse(
      "Invalid required parameter: id (must be a positive integer)",
    );
  }

  logger.info("get_m365_update called", { id: params.id });

  try {
    const feature = getFeatureById(db, params.id);

    if (!feature) {
      logger.warn("Feature not found", { id: params.id });
      return createErrorResponse(`Feature not found: ${params.id}`);
    }

    // 参考 URL を生成
    const urls = generateReferenceUrls(params.id);

    // レスポンスに参考 URL を追加
    const responseWithUrls = {
      ...feature,
      references: {
        roadmapUrl: urls.roadmapUrlJa,
        roadmapUrlEn: urls.roadmapUrl,
        learnSearchUrl: urls.learnSearchUrlJa,
        learnSearchUrlEn: urls.learnSearchUrl,
      },
    };

    logger.info("get_m365_update completed", { id: params.id });

    return createSuccessResponse(responseWithUrls);
  } catch (error) {
    const err = error as Error;
    logger.error("get_m365_update failed", {
      id: params.id,
      error: err.message,
    });
    return createErrorResponse(`Failed to get feature: ${err.message}`);
  }
}
