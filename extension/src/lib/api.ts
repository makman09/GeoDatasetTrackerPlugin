import type { GeoDataset, ParsedResult, Status } from "./types";

export const API_BASE = "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`API ${init?.method ?? "GET"} ${path} failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface ListResponse {
  items: GeoDataset[];
  total: number;
}

export interface LookupRequestItem {
  accession: string;
  title: string;
  source_url: string;
  sample_count?: number;
  platform?: string;
}

export interface LookupResponse {
  datasets: Record<string, GeoDataset>;
}

export interface PatchBody {
  status?: Status;
  reason?: string | null;
  notes?: string | null;
  sample_count?: number | null;
  platform?: string | null;
}

export const api = {
  health(): Promise<{ ok: boolean }> {
    return request("/healthz");
  },
  list(params: { status?: Status; q?: string; limit?: number; offset?: number } = {}): Promise<ListResponse> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.q) qs.set("q", params.q);
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.offset != null) qs.set("offset", String(params.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<ListResponse>(`/datasets${suffix}`);
  },
  get(accession: string): Promise<GeoDataset> {
    return request<GeoDataset>(`/datasets/${encodeURIComponent(accession)}`);
  },
  create(body: LookupRequestItem & { status?: Status }): Promise<GeoDataset> {
    return request<GeoDataset>("/datasets", { method: "POST", body: JSON.stringify(body) });
  },
  patch(accession: string, body: PatchBody): Promise<GeoDataset> {
    return request<GeoDataset>(`/datasets/${encodeURIComponent(accession)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  remove(accession: string): Promise<void> {
    return request<void>(`/datasets/${encodeURIComponent(accession)}`, { method: "DELETE" });
  },
  lookup(items: ParsedResult[]): Promise<LookupResponse> {
    const body = {
      items: items.map((p) => ({
        accession: p.accession,
        title: p.title,
        source_url: p.sourceUrl,
        ...(p.sampleCount != null ? { sample_count: p.sampleCount } : {}),
        ...(p.platform != null ? { platform: p.platform } : {}),
      })),
    };
    return request<LookupResponse>("/datasets/lookup", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
