import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { parseSearchResults } from "../content/parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("parseSearchResults", () => {
  const html = readFileSync(resolve(__dirname, "../../../geo_search_results.html"), "utf8");
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const results = parseSearchResults(doc);

  it("finds at least one result", () => {
    expect(results.length).toBeGreaterThan(0);
  });

  it("every accession matches /^GSE\\d+$/", () => {
    for (const r of results) {
      expect(r.accession).toMatch(/^GSE\d+$/);
    }
  });

  it("every sourceUrl contains acc.cgi?acc=GSE", () => {
    for (const r of results) {
      expect(r.sourceUrl).toContain("acc.cgi?acc=GSE");
    }
  });

  it("at least one result has a non-empty title", () => {
    expect(results.some((r) => r.title && r.title.length > 0)).toBe(true);
  });
});
