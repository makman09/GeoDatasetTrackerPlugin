import { api } from "../lib/bridge";
import { cache } from "../lib/cache";
import { HEALTH_KEY, type GeoDataset, type HealthState, type Status } from "../lib/types";
import { parseDetailPage } from "./parser";
import { ensureConnectionIndicator, renderStatusDropdown, type DropdownHandle } from "./ui";

let online = false;
let handle: DropdownHandle | null = null;

async function loadDataset(accession: string): Promise<GeoDataset | undefined> {
  try {
    const ds = await api.get(accession);
    online = true;
    await cache.put(accession, ds);
    return ds;
  } catch (err) {
    console.warn("[gdc] detail fetch failed, trying cache", err);
    online = false;
    return cache.get(accession);
  }
}

async function ensureExists(accession: string, title: string, sourceUrl: string): Promise<GeoDataset | undefined> {
  let ds = await loadDataset(accession);
  if (ds) return ds;
  try {
    const res = await api.lookup([{ accession, title, sourceUrl }]);
    online = true;
    const created = res.datasets[accession];
    if (created) await cache.put(accession, created);
    return created;
  } catch (err) {
    console.warn("[gdc] detail lookup failed", err);
    return undefined;
  }
}

function mountWidget(accession: string, dataset: GeoDataset): void {
  const existing = document.getElementById("gdc-detail-widget");
  if (existing) existing.remove();

  const wrap = document.createElement("div");
  wrap.id = "gdc-detail-widget";
  wrap.className = "gdc-detail-widget";

  const title = document.createElement("span");
  title.className = "gdc-detail-widget-title";
  title.textContent = `GDC ${accession}`;
  wrap.appendChild(title);

  const reasonInput = document.createElement("textarea");
  reasonInput.className = "gdc-reason-input";
  reasonInput.placeholder = "reason / notes";
  reasonInput.rows = 2;
  reasonInput.value = dataset.reason ?? "";

  handle = renderStatusDropdown(accession, dataset.status, async (next: Status) => {
    if (!online) return;
    const updated = await api.patch(accession, { status: next });
    dataset.status = updated.status;
    dataset.reason = updated.reason;
    await cache.put(accession, updated);
    handle?.setStatus(updated.status);
    reasonInput.value = updated.reason ?? "";
  });
  handle.setEnabled(online, online ? undefined : "Backend offline — edits disabled");
  wrap.appendChild(handle.root);

  reasonInput.addEventListener("blur", async () => {
    if (!online) return;
    const next = reasonInput.value.trim() === "" ? null : reasonInput.value.trim();
    if (next === (dataset.reason ?? null)) return;
    const updated = await api.patch(accession, { reason: next });
    dataset.reason = updated.reason;
    await cache.put(accession, updated);
  });
  wrap.appendChild(reasonInput);

  document.body.appendChild(wrap);
}

export function initDetailPageScript(): void {
  const parsed = parseDetailPage(window.location.href, document);
  if (!parsed) return;

  const indicator = ensureConnectionIndicator();

  void chrome.storage.local.get(HEALTH_KEY).then((out) => {
    const state = out[HEALTH_KEY] as HealthState | undefined;
    if (state) {
      indicator.update(state.online);
      online = state.online;
      handle?.setEnabled(online, online ? undefined : "Backend offline — edits disabled");
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const change = changes[HEALTH_KEY];
    if (!change) return;
    const next = change.newValue as HealthState | undefined;
    if (!next) return;
    indicator.update(next.online);
    online = next.online;
    handle?.setEnabled(online, online ? undefined : "Backend offline — edits disabled");
  });

  void ensureExists(parsed.accession, parsed.title, parsed.sourceUrl).then((ds) => {
    if (ds) mountWidget(parsed.accession, ds);
  });
}
