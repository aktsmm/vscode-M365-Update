import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchAllFeaturesWithETag,
  getCachedETag,
  setCachedETag,
} from "./m365RoadmapClient.js";
import * as logger from "../utils/logger.js";

vi.mock("../utils/logger.js", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe("m365RoadmapClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.unstubAllGlobals();
    setCachedETag(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    setCachedETag(null);
  });

  it("transient fetch error 後にリトライして成功すること", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary network error"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            value: [
              {
                id: 548643,
                title: "Teams feature",
                description: "Feature description",
                cloudInstances: ["Worldwide"],
                platforms: ["Web"],
                releaseRings: ["General Availability"],
                products: ["Microsoft Teams"],
                generalAvailabilityDate: "2026-05",
                previewAvailabilityDate: null,
                status: "Launched",
                created: "2026-05-01T00:00:00.000Z",
                modified: "2026-05-20T00:00:00.000Z",
                availabilities: [],
              },
            ],
          }),
          {
            status: 200,
            headers: new Headers({ ETag: '"etag-1"' }),
          },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = fetchAllFeaturesWithETag(false);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.modified).toBe(true);
    expect(result.features).toHaveLength(1);
    expect(result.etag).toBe('"etag-1"');
    expect(getCachedETag()).toBe('"etag-1"');
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("304 Not Modified の場合は cached ETag を維持して空配列を返すこと", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 304,
        headers: new Headers(),
      }),
    );

    vi.stubGlobal("fetch", fetchMock);
    setCachedETag('"etag-304"');

    const result = await fetchAllFeaturesWithETag(true);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.microsoft.com/releasecommunications/api/v2/m365",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          "If-None-Match": '"etag-304"',
          "User-Agent": "M365-Update-MCP-Server",
        }),
      }),
    );
    expect(result).toEqual({
      modified: false,
      features: [],
      etag: '"etag-304"',
    });
  });
});
