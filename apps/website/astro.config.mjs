import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://outlayo.com",
  output: "static",
  server: {
    host: true,
    port: 4321
  }
});
