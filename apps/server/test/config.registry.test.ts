import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { buildConnectorRegistry } from "../src/registry.js";

describe("alpha integration config and registry", () => {
  it("loads and wires mapbox connector when configured", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: "8787",
      OPENAI_ENABLED: "false",
      MAPBOX_ENABLED: "true",
      MAPBOX_TOKEN: "token",
      MAPBOX_USERNAME: "acct",
      MAPBOX_PRICING_JSON: '{"geocoding.requests":0.00075}'
    });

    const connectors = buildConnectorRegistry(config);
    expect(connectors.map((connector) => connector.name())).toContain("mapbox");
  });
});
