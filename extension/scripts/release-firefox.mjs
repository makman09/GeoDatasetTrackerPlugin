import { spawnSync } from "node:child_process";
import { readdirSync, copyFileSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const extRoot = resolve(__dirname, "..");
const repoRoot = resolve(extRoot, "..");

const manifestPath = join(extRoot, "manifests", "firefox.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const version = manifest.version;
const addonId = manifest.browser_specific_settings.gecko.id;

const xpiSrcDir = join(extRoot, "dist", "firefox-xpi");
const releasesDir = join(repoRoot, "releases");
const xpiDestDir = join(releasesDir, "xpis");
const destName = `geo_dataset_collector-${version}.xpi`;
const AMO_KEY_URL = "https://addons.mozilla.org/en-US/developers/addon/api/key/";

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

if (existsSync(join(xpiDestDir, destName))) {
  die(
    `Version ${version} is already released (releases/xpis/${destName} exists).\n` +
    `   → Bump "version" in extension/manifests/firefox.json and retry.`,
  );
}

if (!existsSync(join(extRoot, ".env"))) {
  die(
    `extension/.env not found.\n` +
    `   → Create it with WEB_EXT_API_KEY and WEB_EXT_API_SECRET.\n` +
    `   → Generate credentials at: ${AMO_KEY_URL}`,
  );
}

console.log(`▶ Building extension...`);
const build = spawnSync("node", ["scripts/build.mjs"], { cwd: extRoot, stdio: "inherit" });
if (build.status !== 0) die("Build failed.");

console.log(`\n▶ Signing ${version} with AMO (this usually takes 3-10 minutes)...`);
const sign = spawnSync(
  "npx",
  [
    "dotenv", "-e", ".env", "--",
    "web-ext", "sign",
    "--source-dir=dist/firefox",
    "--artifacts-dir=dist/firefox-xpi",
    "--channel=unlisted",
  ],
  { cwd: extRoot, encoding: "utf8" },
);

process.stdout.write(sign.stdout ?? "");
process.stderr.write(sign.stderr ?? "");

if (sign.status !== 0) {
  const output = `${sign.stdout ?? ""}\n${sign.stderr ?? ""}`;
  if (/Version .* already exists/i.test(output)) {
    die(
      `AMO already has version ${version}. Each submission needs a unique version.\n` +
      `   → Bump "version" in extension/manifests/firefox.json and retry.`,
    );
  }
  if (/JWT|Unauthorized|401/i.test(output)) {
    die(
      `AMO rejected the credentials (likely expired or revoked API key).\n` +
      `   → Regenerate credentials at: ${AMO_KEY_URL}\n` +
      `   → Update WEB_EXT_API_KEY and WEB_EXT_API_SECRET in extension/.env`,
    );
  }
  die("Signing failed. See output above.");
}

const signed = readdirSync(xpiSrcDir).filter((f) => f.endsWith(`-${version}.xpi`));
if (signed.length === 0) {
  die(`No signed .xpi for version ${version} found in ${xpiSrcDir}.`);
}

mkdirSync(xpiDestDir, { recursive: true });
copyFileSync(join(xpiSrcDir, signed[0]), join(xpiDestDir, destName));
console.log(`\n▶ Copied ${signed[0]} → releases/xpis/${destName}`);

const existing = readdirSync(xpiDestDir)
  .filter((f) => f.endsWith(".xpi"))
  .map((f) => {
    const match = f.match(/-(\d+\.\d+\.\d+)\.xpi$/);
    return match ? { version: match[1], file: f } : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));

const baseUrl = "https://raw.githubusercontent.com/makman09/GeoDatasetTrackerPlugin/main/releases/xpis";
const updates = {
  addons: {
    [addonId]: {
      updates: existing.map((e) => ({
        version: e.version,
        update_link: `${baseUrl}/${e.file}`,
      })),
    },
  },
};

writeFileSync(join(releasesDir, "updates.json"), JSON.stringify(updates, null, 2) + "\n");
console.log(`▶ Wrote releases/updates.json (${existing.length} versions total)`);
console.log(`\n✅ Release ${version} ready. Commit releases/ and push.`);
