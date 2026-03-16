import { defineConfig } from "astro/config";

const site = process.env.WEBSITE_SITE_URL ?? "https://outlayo.com";
const base = process.env.WEBSITE_BASE_PATH ?? "/";

export default defineConfig({
  site,
  base,
  output: "static",
  server: {
    host: true,
    port: 4321
  }
});
