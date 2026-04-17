export const Status = {
  NEW: "NEW",
  REJECTED_COMPLEX: "REJECTED_COMPLEX",
  REJECTED_CELL_CULTURE: "REJECTED_CELL_CULTURE",
  REJECTED_OTHER: "REJECTED_OTHER",
  COLLECTED_TODO: "COLLECTED_TODO",
  COLLECTED_COMPLETE: "COLLECTED_COMPLETE",
} as const;

export type Status = (typeof Status)[keyof typeof Status];

export const STATUS_VALUES: Status[] = [
  Status.NEW,
  Status.REJECTED_COMPLEX,
  Status.REJECTED_CELL_CULTURE,
  Status.REJECTED_OTHER,
  Status.COLLECTED_TODO,
  Status.COLLECTED_COMPLETE,
];

export const STATUS_LABELS: Record<Status, string> = {
  NEW: "New",
  REJECTED_COMPLEX: "Rejected: complex",
  REJECTED_CELL_CULTURE: "Rejected: cell culture",
  REJECTED_OTHER: "Rejected: other",
  COLLECTED_TODO: "Collect: todo",
  COLLECTED_COMPLETE: "Collected",
};

export interface GeoDataset {
  id: string;
  accession: string;
  title: string;
  source_url: string;
  status: Status;
  reason: string | null;
  notes: string | null;
  sample_count: number | null;
  platform: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParsedResult {
  accession: string;
  title: string;
  sourceUrl: string;
  sampleCount?: number;
  platform?: string;
}

export interface HealthState {
  online: boolean;
  lastCheck: number;
}

export const HEALTH_KEY = "gdc:health";
export const CACHE_PREFIX = "gdc:ds:";
