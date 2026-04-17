import { api } from "./api";
import { HEALTH_KEY, type HealthState } from "./types";

const POLL_MS = 15_000;

async function tick(): Promise<void> {
  const state: HealthState = { online: false, lastCheck: Date.now() };
  try {
    const r = await api.health();
    state.online = !!r.ok;
  } catch {
    state.online = false;
  }
  await chrome.storage.local.set({ [HEALTH_KEY]: state });
}

export function startHealthPolling(): void {
  void tick();
  setInterval(() => {
    void tick();
  }, POLL_MS);
}
