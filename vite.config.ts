import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function shareApiPlugin(): Plugin {
  return {
    name: "synlumae-share-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || "";
        if (!url.startsWith("/api/share")) {
          next();
          return;
        }
        void (async () => {
          try {
            const mod = (await server.ssrLoadModule("/src/lib/share/node-adapter.ts")) as {
              handleShareNode: (req: unknown, res: unknown) => Promise<unknown>;
            };
            await mod.handleShareNode(req, res);
          } catch (err) {
            console.error(err);
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: "share api failed", code: "server_error" }));
          }
        })();
      });
    },
  };
}

export default defineConfig({
  server: {
    port: 8080,
  },
  // Project Pages live at https://<user>.github.io/<repo>/ — set BASE_PATH in CI.
  base: process.env.BASE_PATH || "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    shareApiPlugin(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    // SPA-only: do not add nitro(). Nitro's Vercel preset writes
    // .vercel/output (Build Output API) and can replace dist/client with an
    // empty deploy. vercel.json publishes dist/client as a static site.
    tanstackStart({
      spa: { enabled: true },
      server: { entry: "server" },
    }),
    viteReact(),
    tailwindcss(),
  ],
});
