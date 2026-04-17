import { api } from "../lib/bridge";
import { cache } from "../lib/cache";
import { HEALTH_KEY, type GeoDataset, type HealthState, type ParsedResult, type Status } from "../lib/types";
import { findRprtForAccession, parseSearchResults } from "./parser";
import { applyResultTint, ensureConnectionIndicator, renderStatusDropdown, type DropdownHandle } from "./ui";

const handles = new Map<string, DropdownHandle>();
let online = false;

async function loadDatasets(parsed: ParsedResult[]): Promise<Record<string, GeoDataset>> {
  if (parsed.length === 0) return {};
  try {
    const res = await api.lookup(parsed);
    online = true;
    await cache.putMany(res.datasets);
    return res.datasets;
  } catch (err) {
    console.warn("[gdc] lookup failed, falling back to cache", err);
    online = false;
    return cache.getMany(parsed.map((p) => p.accession));
  }
}

function decorate(rprt: Element, dataset: GeoDataset): void {
  const rslt = rprt.querySelector(".rslt");
  if (!rslt) return;
  applyResultTint(rslt, dataset.status);

  const accession = dataset.accession;

  const handle = renderStatusDropdown(accession, dataset.status, async (next: Status) => {
    if (!online) return;
    const body: { status: Status; reason?: string | null } = { status: next };
    if (next.startsWith("REJECTED_")) {
      const existing = dataset.reason ?? "";
      const entered = window.prompt(`Reason for ${next} on ${accession}:`, existing);
      if (entered === null) {
        handle.setStatus(dataset.status);
        return;
      }
      body.reason = entered.trim() === "" ? null : entered.trim();
    }
    const updated = await api.patch(accession, body);
    dataset.status = updated.status;
    dataset.reason = updated.reason;
    await cache.put(accession, updated);
    handle.setStatus(updated.status);
    applyResultTint(rslt, updated.status);
  });
  handle.setEnabled(online, online ? undefined : "Backend offline — edits disabled");
  (rslt as HTMLElement).appendChild(handle.root);
  handles.set(accession, handle);
}

async function refresh(): Promise<void> {
  const parsed = parseSearchResults(document);
  if (parsed.length === 0) return;
  const pending: { item: typeof parsed[number]; rprt: Element }[] = [];
  for (const p of parsed) {
    const rprt = findRprtForAccession(document, p.accession);
    if (!rprt) continue;
    if (rprt.querySelector(".gdc-badge")) continue;
    pending.push({ item: p, rprt });
  }
  if (pending.length === 0) return;
  const datasets = await loadDatasets(pending.map((p) => p.item));
  for (const { item, rprt } of pending) {
    const ds = datasets[item.accession];
    if (!ds) continue;
    decorate(rprt, ds);
  }
}

function setOnline(next: boolean): void {
  online = next;
  for (const h of handles.values()) {
    h.setEnabled(next, next ? undefined : "Backend offline — edits disabled");
  }
}

export function initSearchResultsScript(): void {
  const indicator = ensureConnectionIndicator();

  void chrome.storage.local.get(HEALTH_KEY).then((out) => {
    const state = out[HEALTH_KEY] as HealthState | undefined;
    if (state) {
      indicator.update(state.online);
      setOnline(state.online);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const change = changes[HEALTH_KEY];
    if (!change) return;
    const next = change.newValue as HealthState | undefined;
    if (!next) return;
    indicator.update(next.online);
    setOnline(next.online);
  });

  void refresh();

  const main = document.getElementById("maincontent") ?? document.body;
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      void refresh();
    }, 250);
  });
  observer.observe(main, { childList: true, subtree: true });
}
