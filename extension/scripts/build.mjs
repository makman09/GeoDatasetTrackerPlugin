import { spawnSync } from "node:child_process";
import { mkdirSync, copyFileSync, rmSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

const targets = ["chrome", "firefox"];
const entries = ["content", "background", "popup"];

// Ensure icons exist
const iconScript = resolve(__dirname, "make-icons.mjs");
const iconRun = spawnSync("node", [iconScript], { cwd: root, stdio: "inherit" });
if (iconRun.status !== 0) process.exit(iconRun.status ?? 1);

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    const s = join(src, name);
    const d = join(dest, name);
    if (statSync(s).isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

for (const target of targets) {
  const outDir = join(root, "dist", target);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  for (const entry of entries) {
    const r = spawnSync("npx", ["vite", "build"], {
      cwd: root,
      env: { ...process.env, TARGET: target, ENTRY: entry },
      stdio: "inherit",
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }

  // Copy manifest
  const manifestSrc = join(root, "manifests", `${target}.json`);
  copyFileSync(manifestSrc, join(outDir, "manifest.json"));

  // Copy styles.css
  copyFileSync(join(root, "src", "content", "styles.css"), join(outDir, "styles.css"));

  // Copy popup html and css
  copyFileSync(join(root, "src", "popup", "popup.html"), join(outDir, "popup.html"));
  copyFileSync(join(root, "src", "popup", "popup.css"), join(outDir, "popup.css"));

  // Copy public icons
  const publicDir = join(root, "public");
  if (existsSync(publicDir)) {
    for (const name of readdirSync(publicDir)) {
      copyFileSync(join(publicDir, name), join(outDir, name));
    }
  }

  console.log(`Built ${target} -> ${outDir}`);
}
