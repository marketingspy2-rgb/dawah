import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/postcss";
import { fileURLToPath } from "node:url";

// Cloudflare build. `npm run dev` / `npm run build` still use Next.js for the local demo.
export default defineConfig({
  // Inline PostCSS setup so Vite does not load postcss.config.mjs (that file is for Next.js).
  css: { postcss: { plugins: [tailwindcss()] } },
  resolve: {
    alias: [
      // On Cloudflare the demo data lives in D1 instead of a local JSON file.
      { find: /^@\/lib\/storage$/, replacement: fileURLToPath(new URL("./src/lib/storage.cloudflare.ts", import.meta.url)) },
    ],
  },
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
