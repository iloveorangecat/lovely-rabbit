import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig(({ mode }) => {
  const base = loadEnv(mode, ".", "").VITE_BASE_PATH || "/";
  if (
    !/^\/(?:[A-Za-z0-9._-]+\/)*$/.test(base) ||
    base.split("/").includes("..")
  )
    throw new Error(
      "VITE_BASE_PATH must be / or a path such as /beauty-quest/",
    );
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icon-192.png", "icon-512.png", "maskable-512.png"],
        manifest: {
          name: "兔兔要减肥 lovely rabbit",
          short_name: "兔兔要减肥",
          description: "属于你的温柔成长手账",
          lang: "zh-CN",
          id: base,
          start_url: base,
          scope: base,
          display: "standalone",
          orientation: "portrait",
          background_color: "#F0EDE7",
          theme_color: "#F0EDE7",
          icons: [
            { src: `${base}icon-192.png`, sizes: "192x192", type: "image/png" },
            {
              src: `${base}icon-512.png`,
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: `${base}maskable-512.png`,
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,json,png,webp,svg,woff2}"],
          navigateFallback: `${base}index.html`,
          cleanupOutdatedCaches: true,
        },
      }),
    ],
  };
});
