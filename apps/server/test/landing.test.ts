import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { SQLiteStore } from "@outlayo/store-sqlite";
import { createApp } from "../src/app.js";

describe("landing page", () => {
  const stores: SQLiteStore[] = [];

  afterEach(async () => {
    while (stores.length) {
      await stores.pop()!.close();
    }
  });

  it("renders marketing route with core messaging and CTA", async () => {
    const store = new SQLiteStore(":memory:");
    stores.push(store);
    await store.migrate();

    const app = createApp({
      store,
      connectors: [],
      adminHeaderName: "x-outlayo-admin-token",
      adminToken: null,
      now: () => new Date("2026-03-12T00:00:00.000Z")
    });

    const response = await request(app).get("/landing");
    expect(response.status).toBe(200);
    expect(response.text).toContain("Stop surprise usage bills before they hit your runway.");
    expect(response.text).toContain("Request early access");
    expect(response.text).toContain("Explore the OSS repo");
    expect(response.text).toContain("github.com/outlayo/outlayo");
  });
});
