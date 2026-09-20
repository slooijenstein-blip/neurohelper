/**
 * Make the TanStack Start SPA output publishable as static files.
 *
 * Start SPA prerender writes dist/client/_shell.html, not index.html.
 * Vercel (and most static hosts) need index.html at the output root.
 *
 * If Nitro/Vercel Build Output API lands in .vercel/output, Vercel publishes
 * that instead of dist/client — which is how production 404'd. Strip it.
 *
 * On Vercel, also drop dist/server so static-build does not wrap a server
 * function around this client-only SPA.
 */
import { copyFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = path.join(root, "dist", "client");
const shell = path.join(clientDir, "_shell.html");
const index = path.join(clientDir, "index.html");
const boa = path.join(root, ".vercel", "output");
const serverDir = path.join(root, "dist", "server");

if (existsSync(boa)) {
  rmSync(boa, { recursive: true, force: true });
  console.log("Removed .vercel/output so Vercel publishes dist/client as a static SPA.");
}

if (process.env.VERCEL && existsSync(serverDir)) {
  rmSync(serverDir, { recursive: true, force: true });
  console.log("Removed dist/server (not used for the static SPA on Vercel).");
}

if (!existsSync(shell) && !existsSync(index)) {
  throw new Error(
    `Missing SPA shell. Expected ${shell} or ${index} after vite build.`,
  );
}

if (existsSync(shell)) {
  copyFileSync(shell, index);
  console.log("Copied dist/client/_shell.html → dist/client/index.html");
}

if (!existsSync(index)) {
  throw new Error(`Missing ${index} after SPA prepare step.`);
}
