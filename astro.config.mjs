import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  integrations: [mdx()],
  output: "static",
  vite: {
    resolve: {
      alias: {
        "@core": "/src/core",
        "@themes": "/src/themes",
        "@shared": "/src/shared",
        "@config": "/src/config"
      }
    }
  }
});
