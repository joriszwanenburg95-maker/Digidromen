export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key) ?? null : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

let memoryStorage: MemoryStorage | undefined;

export function getStorage(storage?: StorageLike): StorageLike {
  if (storage) {
    return storage;
  }

  if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
    return globalThis.localStorage as StorageLike;
  }

  if (!memoryStorage) {
    memoryStorage = new MemoryStorage();
  }

  return memoryStorage;
}
