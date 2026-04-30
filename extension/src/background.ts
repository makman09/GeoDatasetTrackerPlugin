import { api } from "./lib/api";
import type { BridgeMessage } from "./lib/bridge";
import { startHealthPolling } from "./lib/health";

chrome.runtime.onInstalled.addListener(() => {
  startHealthPolling();
});

chrome.runtime.onStartup.addListener(() => {
  startHealthPolling();
});

startHealthPolling();

const ALLOWED_SENDER_URL_PREFIX = "https://www.ncbi.nlm.nih.gov/";

chrome.runtime.onMessage.addListener((raw, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ error: "sender not trusted" });
    return false;
  }
  const fromContentScript = typeof sender.tab?.id === "number";
  if (fromContentScript && !sender.url?.startsWith(ALLOWED_SENDER_URL_PREFIX)) {
    sendResponse({ error: "sender origin not allowed" });
    return false;
  }
  const msg = raw as BridgeMessage;
  (async () => {
    try {
      let data: unknown;
      switch (msg.type) {
        case "health":
          data = await api.health();
          break;
        case "list":
          data = await api.list(msg.params);
          break;
        case "get":
          data = await api.get(msg.accession);
          break;
        case "patch":
          data = await api.patch(msg.accession, msg.body);
          break;
        case "remove":
          data = await api.remove(msg.accession);
          break;
        case "lookup":
          data = await api.lookup(msg.items);
          break;
        default:
          throw new Error(`unknown message type: ${(msg as { type: string }).type}`);
      }
      sendResponse({ data });
    } catch (err) {
      sendResponse({ error: (err as Error).message });
    }
  })();
  return true;
});
