import type { ListResponse, LookupResponse, PatchBody } from "./api";
import type { GeoDataset, ParsedResult, Status } from "./types";

export type BridgeMessage =
  | { type: "health" }
  | { type: "list"; params: { status?: Status; q?: string; limit?: number; offset?: number } }
  | { type: "get"; accession: string }
  | { type: "patch"; accession: string; body: PatchBody }
  | { type: "remove"; accession: string }
  | { type: "lookup"; items: ParsedResult[] };

interface BridgeResponse<T> {
  data?: T;
  error?: string;
}

async function send<T>(msg: BridgeMessage): Promise<T> {
  const res = (await chrome.runtime.sendMessage(msg)) as BridgeResponse<T> | undefined;
  if (!res) throw new Error("no response from background");
  if (res.error) throw new Error(res.error);
  return res.data as T;
}

export const api = {
  health: () => send<{ ok: boolean }>({ type: "health" }),
  list: (params: { status?: Status; q?: string; limit?: number; offset?: number } = {}) =>
    send<ListResponse>({ type: "list", params }),
  get: (accession: string) => send<GeoDataset>({ type: "get", accession }),
  patch: (accession: string, body: PatchBody) => send<GeoDataset>({ type: "patch", accession, body }),
  remove: (accession: string) => send<void>({ type: "remove", accession }),
  lookup: (items: ParsedResult[]) => send<LookupResponse>({ type: "lookup", items }),
};
