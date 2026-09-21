import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function familyApiDevPlugin(): Plugin {
  return {
    name: "synlumae-family-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/family")) {
          next();
          return;
        }
        void import("./src/lib/family/node-adapter")
          .then(({ handleNodeFamilyRequest }) => handleNodeFamilyRequest(req, res))
          .catch(next);
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
    familyApiDevPlugin(),
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
