import { STATUS_LABELS, STATUS_VALUES, type Status } from "../lib/types";

export const STATUS_CLASS: Record<Status, string> = {
  NEW: "gdc-status-new",
  REJECTED_COMPLEX: "gdc-status-rej-complex",
  REJECTED_CELL_CULTURE: "gdc-status-rej-cell",
  REJECTED_OTHER: "gdc-status-rej-other",
  COLLECTED_TODO: "gdc-status-todo",
  COLLECTED_COMPLETE: "gdc-status-done",
};

export interface DropdownHandle {
  root: HTMLElement;
  setStatus(s: Status): void;
  setEnabled(enabled: boolean, tooltip?: string): void;
}

export function renderStatusDropdown(
  accession: string,
  current: Status,
  onChange: (next: Status) => void | Promise<void>,
): DropdownHandle {
  const root = document.createElement("div");
  root.className = `gdc-badge ${STATUS_CLASS[current]}`;
  root.dataset.gdcAccession = accession;

  const label = document.createElement("span");
  label.className = "gdc-badge-label";
  label.textContent = STATUS_LABELS[current];

  const select = document.createElement("select");
  select.className = "gdc-badge-select";
  for (const s of STATUS_VALUES) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = STATUS_LABELS[s];
    if (s === current) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener("change", async (e) => {
    e.stopPropagation();
    const next = select.value as Status;
    try {
      await onChange(next);
    } catch (err) {
      console.error("[gdc] status update failed", err);
    }
  });
  select.addEventListener("click", (e) => e.stopPropagation());

  root.appendChild(label);
  root.appendChild(select);

  return {
    root,
    setStatus(s: Status) {
      for (const cls of Object.values(STATUS_CLASS)) root.classList.remove(cls);
      root.classList.add(STATUS_CLASS[s]);
      label.textContent = STATUS_LABELS[s];
      select.value = s;
    },
    setEnabled(enabled: boolean, tooltip?: string) {
      select.disabled = !enabled;
      if (tooltip) root.title = tooltip;
      else root.removeAttribute("title");
      root.classList.toggle("gdc-disabled", !enabled);
    },
  };
}

export function applyResultTint(rsltEl: Element, status: Status): void {
  for (const cls of Object.values(STATUS_CLASS)) rsltEl.classList.remove(cls);
  rsltEl.classList.add(STATUS_CLASS[status]);
  rsltEl.classList.add("gdc-tinted");
}

export function ensureConnectionIndicator(): { update(online: boolean): void } {
  const id = "gdc-conn-indicator";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.className = "gdc-conn-indicator gdc-conn-offline";
    el.title = "Backend offline";
    document.body.appendChild(el);
  }
  return {
    update(online: boolean) {
      const node = document.getElementById(id);
      if (!node) return;
      node.classList.toggle("gdc-conn-online", online);
      node.classList.toggle("gdc-conn-offline", !online);
      node.title = online
        ? "Backend online"
        : "Backend offline — showing cached data, edits disabled";
    },
  };
}
