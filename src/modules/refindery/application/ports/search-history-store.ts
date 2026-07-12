export type SearchHistoryEntry = {
  query: string;
  k: number;
  candidates: number;
  rerank: boolean;
  domain: string;
  /** ISO timestamp of the successful execution. */
  executedAt: string;
};

export type SearchHistoryStore = {
  subscribe(listener: () => void): () => void;
  getSnapshot(): readonly SearchHistoryEntry[];
  getServerSnapshot(): readonly SearchHistoryEntry[];
  record(entry: SearchHistoryEntry): void;
  clear(): void;
};
