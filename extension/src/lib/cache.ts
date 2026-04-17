import { CACHE_PREFIX, type GeoDataset } from "./types";

function key(accession: string): string {
  return `${CACHE_PREFIX}${accession}`;
}

export const cache = {
  async put(accession: string, dataset: GeoDataset): Promise<void> {
    await chrome.storage.local.set({ [key(accession)]: dataset });
  },
  async putMany(datasets: Record<string, GeoDataset>): Promise<void> {
    const payload: Record<string, GeoDataset> = {};
    for (const [acc, ds] of Object.entries(datasets)) payload[key(acc)] = ds;
    await chrome.storage.local.set(payload);
  },
  async get(accession: string): Promise<GeoDataset | undefined> {
    const k = key(accession);
    const out = await chrome.storage.local.get(k);
    return out[k] as GeoDataset | undefined;
  },
  async getMany(accessions: string[]): Promise<Record<string, GeoDataset>> {
    if (accessions.length === 0) return {};
    const keys = accessions.map(key);
    const out = await chrome.storage.local.get(keys);
    const result: Record<string, GeoDataset> = {};
    for (const acc of accessions) {
      const v = out[key(acc)] as GeoDataset | undefined;
      if (v) result[acc] = v;
    }
    return result;
  },
};
