/**
 * Build NeuroHelper and publish dist/client to origin/gh-pages (no force-push).
 * Uses gh auth setup-git; never writes tokens into remotes.
 */
import { execFileSync, execSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoHttps = "https://github.com/slooijenstein-blip/neurohelper.git";
const basePath = "/neurohelper/";
const clientDir = path.join(root, "dist", "client");

function git(args, cwd) {
  execFileSync("git", args, { cwd, stdio: "inherit" });
}

function gitCapture(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

process.env.BASE_PATH = basePath;
console.log(`Building with BASE_PATH=${basePath}`);
execSync("npm run build", { cwd: root, stdio: "inherit", env: process.env });

const shell = path.join(clientDir, "_shell.html");
if (!existsSync(shell)) {
  throw new Error(`Missing ${shell}. Build did not produce a SPA shell.`);
}
copyFileSync(shell, path.join(clientDir, "index.html"));
copyFileSync(shell, path.join(clientDir, "404.html"));
writeFileSync(path.join(clientDir, ".nojekyll"), "");

execFileSync("gh", ["auth", "setup-git"], { cwd: root, stdio: "inherit" });

const work = path.join(tmpdir(), `neurohelper-gh-pages-${Date.now()}`);
console.log(`Cloning gh-pages into ${work}`);
git(["clone", "--branch", "gh-pages", "--single-branch", repoHttps, work], root);

for (const name of readdirSync(work)) {
  if (name === ".git") continue;
  rmSync(path.join(work, name), { recursive: true, force: true });
}
cpSync(clientDir, work, { recursive: true });

git(["add", "-A"], work);
const dirty = gitCapture(["status", "--porcelain"], work);
if (!dirty) {
  console.log("gh-pages already matches this build; nothing to commit.");
  rmSync(work, { recursive: true, force: true });
  process.exit(0);
}

git(["commit", "-m", "Publish GitHub Pages from local build"], work);
git(["push", "origin", "gh-pages"], work);
console.log("Pushed origin/gh-pages (fast-forward, no force).");
rmSync(work, { recursive: true, force: true });
console.log("Live: https://slooijenstein-blip.github.io/neurohelper/");
