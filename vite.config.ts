import { defineConfig } from "vite";
export default defineConfig({
  base: "/",
  plugins: [
    {
      name: "production-analytics",
      apply: "build",
      transformIndexHtml() {
        return [
          {
            tag: "script",
            attrs: {
              defer: true,
              src: "https://cloud.umami.is/script.js",
              "data-website-id": "e01c9f78-4607-4e60-b01c-77c8190b12b4",
            },
            injectTo: "head",
          },
        ];
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { phaser: ["phaser"], react: ["react", "react-dom"] },
      },
    },
    chunkSizeWarningLimit: 1400,
  },
});
