import { describe, it, expect, beforeEach, vi } from "vitest";
import type Database from "better-sqlite3";

import { handleSearchM365Roadmap } from "./searchM365Roadmap.js";
import { handleGetM365Update, getM365UpdateSchema } from "./getM365Update.js";
import { handleSyncM365Roadmap } from "./syncM365Roadmap.js";
import { performSync, getSyncStatus } from "../services/sync.service.js";
import { searchFeatures } from "../database/queries.js";

vi.mock("../services/sync.service.js", () => ({
  performSync: vi.fn(),
  getSyncStatus: vi.fn(),
}));

vi.mock("../database/queries.js", () => ({
  searchFeatures: vi.fn(),
  getAllProducts: vi.fn(() => []),
  getAllPlatforms: vi.fn(() => []),
  getAllStatuses: vi.fn(() => []),
  getFeatureById: vi.fn(() => null),
}));

describe("Tool Handlers", () => {
  const mockDb = {} as Database.Database;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("get_m365_update", () => {
    it("schema の id が integer 型であること", () => {
      expect(getM365UpdateSchema.inputSchema.properties.id.type).toBe(
        "integer",
      );
    });

    it("args 未指定時にバリデーションエラーを返すこと", () => {
      const response = handleGetM365Update(mockDb, undefined);

      expect(response.isError).toBe(true);
      const payload = JSON.parse(response.content[0].text) as { error: string };
      expect(payload.error).toContain("Invalid required parameter: id");
    });

    it("不正な id でバリデーションエラーを返すこと", () => {
      const response = handleGetM365Update(mockDb, { id: 0 });

      expect(response.isError).toBe(true);
      const payload = JSON.parse(response.content[0].text) as { error: string };
      expect(payload.error).toContain("positive integer");
    });
  });

  describe("search_m365_roadmap", () => {
    it("不正な limit でバリデーションエラーを返すこと", () => {
      const response = handleSearchM365Roadmap(mockDb, { limit: 0 });

      expect(response.isError).toBe(true);
      const payload = JSON.parse(response.content[0].text) as { error: string };
      expect(payload.error).toContain("Invalid parameter: limit");
      expect(searchFeatures).not.toHaveBeenCalled();
    });

    it("offset を考慮して hasMore を計算すること", () => {
      vi.mocked(searchFeatures).mockReturnValue({
        results: [
          {
            id: 1,
            title: "Item 1",
            description: null,
            status: "Launched",
            products: ["Microsoft Teams"],
            platforms: ["Web"],
            generalAvailabilityDate: "2026-01",
            previewAvailabilityDate: null,
            modified: "2026-01-01T00:00:00.000Z",
          },
          {
            id: 2,
            title: "Item 2",
            description: null,
            status: "Launched",
            products: ["Microsoft Teams"],
            platforms: ["Web"],
            generalAvailabilityDate: "2026-01",
            previewAvailabilityDate: null,
            modified: "2026-01-01T00:00:00.000Z",
          },
        ],
        totalCount: 5,
      });

      const response = handleSearchM365Roadmap(mockDb, {
        query: "Teams",
        limit: 2,
        offset: 2,
      });

      const payload = JSON.parse(response.content[0].text) as {
        hasMore: boolean;
      };
      expect(payload.hasMore).toBe(true);
    });

    it("不正な offset と日付範囲でバリデーションエラーを返すこと", () => {
      const invalidOffset = handleSearchM365Roadmap(mockDb, { offset: -1 });
      const invalidRange = handleSearchM365Roadmap(mockDb, {
        dateFrom: "2026-06",
        dateTo: "2026-01",
      });

      expect(invalidOffset.isError).toBe(true);
      expect(invalidRange.isError).toBe(true);
      expect(searchFeatures).not.toHaveBeenCalled();
    });
  });

  describe("sync_m365_roadmap", () => {
    it("不正な force 型でバリデーションエラーを返すこと", async () => {
      const response = await handleSyncM365Roadmap(mockDb, {
        force: "true" as unknown as boolean,
      });

      expect(response.isError).toBe(true);
      const payload = JSON.parse(response.content[0].text) as { error: string };
      expect(payload.error).toContain("Invalid parameter: force");
      expect(performSync).not.toHaveBeenCalled();
    });

    it("force=true を performSync に伝播すること", async () => {
      vi.mocked(getSyncStatus).mockReturnValue({
        lastSync: "2026-02-28T00:00:00.000Z",
        syncStatus: "idle",
        recordCount: 100,
        hoursSinceSync: 0.2,
      });
      vi.mocked(performSync).mockResolvedValue({
        success: true,
        recordsProcessed: 10,
        recordsInserted: 1,
        recordsUpdated: 9,
        durationMs: 25,
      });

      const response = await handleSyncM365Roadmap(mockDb, { force: true });

      expect(performSync).toHaveBeenCalledWith(mockDb, true);
      expect(response.isError).toBeUndefined();
    });

    it("args 未指定時は fresh 判定で同期をスキップできること", async () => {
      vi.mocked(getSyncStatus).mockReturnValue({
        lastSync: "2026-02-28T00:00:00.000Z",
        syncStatus: "idle",
        recordCount: 200,
        hoursSinceSync: 0.4,
      });

      const response = await handleSyncM365Roadmap(mockDb, undefined);

      expect(performSync).not.toHaveBeenCalled();
      const payload = JSON.parse(response.content[0].text) as { message: string };
      expect(payload.message).toContain("sync skipped");
    });
  });
});
