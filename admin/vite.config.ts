import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vite";

const repoRoot = path.resolve(__dirname, "..");

function serveRepoStatic(): Plugin {
  return {
    name: "serve-repo-static",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url?.split("?")[0] ?? "";
        if (
          !rawUrl.startsWith("/data/") &&
          !rawUrl.startsWith("/images/") &&
          !rawUrl.startsWith("/regions/")
        ) {
          next();
          return;
        }
        const filePath = path.join(repoRoot, decodeURIComponent(rawUrl));
        if (!filePath.startsWith(repoRoot) || !fs.existsSync(filePath)) {
          next();
          return;
        }
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) {
          next();
          return;
        }
        if (rawUrl.endsWith(".json")) {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
        } else if (rawUrl.endsWith(".png")) {
          res.setHeader("Content-Type", "image/png");
        } else if (rawUrl.endsWith(".html")) {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
        }
        createReadStream(filePath).pipe(res);
      });
    },
  };
}

function createReadStream(filePath: string) {
  return fs.createReadStream(filePath);
}

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/teatop-menu-top10/admin/" : "/admin/",
  plugins: [react(), serveRepoStatic()],
  server: {
    port: 5173,
    fs: { allow: [repoRoot] },
  },
}));
