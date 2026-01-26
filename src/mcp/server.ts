/**
 * MCP Server 実装
 *
 * M365 Roadmap 検索・取得ツールを提供する MCP Server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type Database from "better-sqlite3";

import * as logger from "./utils/logger.js";
import {
  searchM365RoadmapSchema,
  handleSearchM365Roadmap,
  getGuideData,
} from "./tools/searchM365Roadmap.js";
import {
  getM365UpdateSchema,
  handleGetM365Update,
} from "./tools/getM365Update.js";
import {
  syncM365RoadmapSchema,
  handleSyncM365Roadmap,
} from "./tools/syncM365Roadmap.js";
import { getSyncStatus } from "./services/sync.service.js";

/**
 * MCP Server 設定
 */
export interface ServerConfig {
  name: string;
  version: string;
  database: Database.Database;
}

/**
 * MCP Server を作成・設定
 */
export function createMCPServer(config: ServerConfig): Server {
  const server = new Server(
    {
      name: config.name,
      version: config.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  // ハンドラ登録
  registerToolHandlers(server, config.database);
  registerResourceHandlers(server, config.database);

  logger.info("MCP server created", {
    name: config.name,
    version: config.version,
    capabilities: ["tools", "resources"],
  });

  return server;
}

/**
 * ツールハンドラ登録
 */
function registerToolHandlers(server: Server, db: Database.Database): void {
  // ツール一覧
  server.setRequestHandler(ListToolsRequestSchema, () => {
    logger.debug("ListTools request received");

    return {
      tools: [
        searchM365RoadmapSchema,
        getM365UpdateSchema,
        syncM365RoadmapSchema,
      ],
    };
  });

  // ツール呼び出し
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    logger.info("CallTool request received", {
      tool: request.params.name,
    });

    switch (request.params.name) {
      case "search_m365_roadmap":
        return handleSearchM365Roadmap(db, request.params.arguments);

      case "get_m365_update":
        return handleGetM365Update(db, request.params.arguments);

      case "sync_m365_roadmap":
        return await handleSyncM365Roadmap(db, request.params.arguments);

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  });
}

/**
 * リソースハンドラ登録
 */
function registerResourceHandlers(server: Server, db: Database.Database): void {
  // リソース一覧
  server.setRequestHandler(ListResourcesRequestSchema, () => {
    logger.debug("ListResources request received");

    return {
      resources: [
        {
          uri: "m365-roadmap://guide",
          name: "M365 Roadmap Search Guide",
          description:
            "Available filter values and metadata to help construct valid search queries. " +
            "Includes all available products, platforms, statuses, and data freshness info.",
          mimeType: "application/json",
        },
      ],
    };
  });

  // リソース読み取り
  server.setRequestHandler(ReadResourceRequestSchema, (request) => {
    logger.info("ReadResource request received", {
      uri: request.params.uri,
    });

    if (request.params.uri === "m365-roadmap://guide") {
      const guideData = getGuideData(db);
      const syncStatus = getSyncStatus(db);

      return {
        contents: [
          {
            uri: "m365-roadmap://guide",
            mimeType: "application/json",
            text: JSON.stringify(
              {
                description: "Use these values to construct search queries",
                availableProducts: guideData.products,
                availablePlatforms: guideData.platforms,
                availableStatuses: guideData.statuses,
                dataFreshness: syncStatus
                  ? {
                      lastSync: syncStatus.lastSync,
                      recordCount: syncStatus.recordCount,
                      hoursSinceSync: syncStatus.hoursSinceSync,
                    }
                  : null,
                examples: {
                  searchCopilot: {
                    query: "Copilot",
                    limit: 10,
                  },
                  filterByProduct: {
                    products: ["Microsoft Teams"],
                    status: "In development",
                  },
                  filterByDate: {
                    dateFrom: "2026-01",
                    dateTo: "2026-06",
                  },
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${request.params.uri}`);
  });
}
