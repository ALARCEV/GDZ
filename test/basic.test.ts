import { describe, expect, it } from "vitest";

import { appConfig } from "../lib/config";

describe("appConfig", () => {
  it("keeps parent-first funnel assumptions", () => {
    expect(appConfig.primaryAudience).toBe("parent");
    expect(appConfig.funnel).toEqual(["guest", "value_moment", "capture"]);
  });
});
