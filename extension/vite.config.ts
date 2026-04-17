import { defineConfig } from "vite";
import { resolve } from "node:path";

const target = process.env.TARGET ?? "chrome";
const entry = process.env.ENTRY ?? "content";

type EntryDef = {
  input: string;
  fileName: string;
  format: "iife" | "es";
  name: string;
};

const entries: Record<string, EntryDef> = {
  content: {
    input: resolve(__dirname, "src/content/index.ts"),
    fileName: "content.js",
    format: "iife",
    name: "gdc_content",
  },
  background: {
    input: resolve(__dirname, "src/background.ts"),
    fileName: "background.js",
    format: "iife",
    name: "gdc_background",
  },
  popup: {
    input: resolve(__dirname, "src/popup/popup.ts"),
    fileName: "popup.js",
    format: "iife",
    name: "gdc_popup",
  },
};

const def = entries[entry];
if (!def) throw new Error(`Unknown ENTRY: ${entry}`);

export default defineConfig({
  build: {
    outDir: `dist/${target}`,
    emptyOutDir: false,
    target: "es2022",
    minify: false,
    sourcemap: false,
    rollupOptions: {
      input: def.input,
      output: {
        format: def.format,
        name: def.name,
        entryFileNames: def.fileName,
        chunkFileNames: def.fileName,
        assetFileNames: "assets/[name][extname]",
        inlineDynamicImports: true,
        extend: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
