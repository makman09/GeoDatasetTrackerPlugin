import { API_BASE } from "../lib/api";
import { HEALTH_KEY, type HealthState } from "../lib/types";

function render(state: HealthState | undefined): void {
  const dot = document.getElementById("health-dot");
  const text = document.getElementById("health-text");
  const last = document.getElementById("last-check");
  const backend = document.getElementById("backend-url");
  if (backend) backend.textContent = API_BASE;
  if (!dot || !text || !last) return;
  if (!state) {
    dot.className = "dot offline";
    text.textContent = "Unknown";
    last.textContent = "—";
    return;
  }
  dot.className = `dot ${state.online ? "online" : "offline"}`;
  text.textContent = state.online ? "Online" : "Offline";
  last.textContent = new Date(state.lastCheck).toLocaleTimeString();
}

void chrome.storage.local.get(HEALTH_KEY).then((out) => {
  render(out[HEALTH_KEY] as HealthState | undefined);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  const change = changes[HEALTH_KEY];
  if (change) render(change.newValue as HealthState | undefined);
});
