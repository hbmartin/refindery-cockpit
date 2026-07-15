export type TokenStore = {
  subscribe(listener: () => void): () => void;
  getSnapshot(): string | null;
  getServerSnapshot(): string | null;
  set(token: string | null): void;
  peek(): string | null;
};
