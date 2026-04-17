import type { ParsedResult } from "../lib/types";

const NCBI_ORIGIN = "https://www.ncbi.nlm.nih.gov";
const ACCESSION_RE = /^GSE\d+$/;
const ACCESSION_ANY_RE = /GSE\d+/;
const SAMPLES_RE = /(\d+)\s+Sample/i;
const PLATFORM_RE = /^GPL\d+/;

function absolutize(href: string): string {
  if (!href) return "";
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("/")) return `${NCBI_ORIGIN}${href}`;
  return `${NCBI_ORIGIN}/${href}`;
}

function findAccession(rprt: Element): string | null {
  const dds = rprt.querySelectorAll("dl.rprtid dd");
  for (const dd of Array.from(dds)) {
    const text = (dd.textContent ?? "").trim();
    if (ACCESSION_RE.test(text)) return text;
  }
  // Fallback: look for any GSE\d+ inside acc.cgi link
  const link = rprt.querySelector('a[href*="acc.cgi?acc=GSE"]') as HTMLAnchorElement | null;
  if (link) {
    const m = link.getAttribute("href")?.match(ACCESSION_ANY_RE);
    if (m) return m[0];
  }
  return null;
}

function findTitleLink(rprt: Element): HTMLAnchorElement | null {
  const primary = rprt.querySelector('p.title > a[href*="acc.cgi?acc="]') as HTMLAnchorElement | null;
  if (primary) return primary;
  return rprt.querySelector('a[href*="acc.cgi?acc=GSE"]') as HTMLAnchorElement | null;
}

function findSampleCount(rprt: Element): number | undefined {
  const dts = rprt.querySelectorAll("dt");
  for (const dt of Array.from(dts)) {
    const text = (dt.textContent ?? "").trim();
    const m = text.match(SAMPLES_RE);
    if (m && m[1]) {
      const n = Number.parseInt(m[1], 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return undefined;
}

function findPlatform(rprt: Element): string | undefined {
  const dds = rprt.querySelectorAll("dl.details dd");
  for (const dd of Array.from(dds)) {
    const text = (dd.textContent ?? "").trim();
    const m = text.match(PLATFORM_RE);
    if (m) return m[0];
  }
  return undefined;
}

export function parseSearchResults(doc: Document): ParsedResult[] {
  const rprts = doc.querySelectorAll("div.rprt");
  const out: ParsedResult[] = [];
  for (const rprt of Array.from(rprts)) {
    try {
      const accession = findAccession(rprt);
      if (!accession) continue;
      const link = findTitleLink(rprt);
      if (!link) {
        console.warn(`[gdc] no title link for ${accession}`);
        continue;
      }
      const title = (link.textContent ?? "").replace(/\s+/g, " ").trim();
      const sourceUrl = absolutize(link.getAttribute("href") ?? "");
      const result: ParsedResult = { accession, title, sourceUrl };
      const sc = findSampleCount(rprt);
      if (sc != null) result.sampleCount = sc;
      const pf = findPlatform(rprt);
      if (pf != null) result.platform = pf;
      out.push(result);
    } catch (err) {
      console.warn("[gdc] parser skipped row:", err);
    }
  }
  return out;
}

export function parseDetailPage(url: string, doc: Document): ParsedResult | null {
  try {
    const u = new URL(url);
    const accession = u.searchParams.get("acc");
    if (!accession || !ACCESSION_RE.test(accession)) return null;
    let title = (doc.title ?? "").trim();
    const h1 = doc.querySelector("h1");
    if (h1?.textContent && h1.textContent.trim().length > 0) {
      title = h1.textContent.trim();
    }
    if (!title) title = accession;
    return { accession, title, sourceUrl: url };
  } catch {
    return null;
  }
}

export function findRprtForAccession(doc: Document, accession: string): Element | null {
  const rprts = doc.querySelectorAll("div.rprt");
  for (const rprt of Array.from(rprts)) {
    if (findAccession(rprt) === accession) return rprt;
  }
  return null;
}
