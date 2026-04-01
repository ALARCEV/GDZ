import { describe, expect, it } from "vitest";

import { parseOptionalDateQueryParam, requireRouteParam } from "../server/http/route";

describe("http route helpers", () => {
  it("parses optional ISO date params", () => {
    const parsed = parseOptionalDateQueryParam("2026-04-01T12:00:00.000Z", "date_from");

    expect(parsed?.toISOString()).toBe("2026-04-01T12:00:00.000Z");
    expect(parseOptionalDateQueryParam(null, "date_to")).toBeUndefined();
  });

  it("reads required route params", async () => {
    await expect(
      requireRouteParam(
        {
          params: Promise.resolve({ id: "chat_123" })
        },
        "id"
      )
    ).resolves.toBe("chat_123");
  });
});
