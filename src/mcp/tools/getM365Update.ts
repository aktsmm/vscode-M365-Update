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
 * ツールスキーマ
 */
export const getM365UpdateSchema = {
  name: "get_m365_update",
  description:
    "Retrieve complete details of a specific M365 Roadmap feature by ID. " +
    "Includes full description, platforms, cloud instances, and availability details. " +
    "Use after search_m365_roadmap to get detailed content.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "number",
        description:
          "Unique identifier of the M365 Roadmap feature (required).",
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
  const params = args as { id?: number };

  if (!params.id) {
    return createErrorResponse("Missing required parameter: id");
  }

  logger.info("get_m365_update called", { id: params.id });

  try {
    const feature = getFeatureById(db, params.id);

    if (!feature) {
      logger.warn("Feature not found", { id: params.id });
      return createErrorResponse(`Feature not found: ${params.id}`);
    }

    logger.info("get_m365_update completed", { id: params.id });

    return createSuccessResponse(feature);
  } catch (error) {
    const err = error as Error;
    logger.error("get_m365_update failed", {
      id: params.id,
      error: err.message,
    });
    return createErrorResponse(`Failed to get feature: ${err.message}`);
  }
}
