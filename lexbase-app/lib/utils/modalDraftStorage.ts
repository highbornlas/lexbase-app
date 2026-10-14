interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createDraftStorage(
  key: string,
  getStorage: () => DraftStorage = () => localStorage,
  delay = 800,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  function cancel() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }
  function save(value: Record<string, unknown>) {
    cancel();
    try { getStorage().setItem(key, JSON.stringify(value)); } catch { /* Storage may be unavailable. */ }
  }
  return {
    cancel,
    save,
    schedule(value: Record<string, unknown>) {
      cancel();
      timer = setTimeout(() => save(value), delay);
    },
    clear() {
      cancel();
      try { getStorage().removeItem(key); } catch { /* Storage may be unavailable. */ }
    },
    has() {
      try { return getStorage().getItem(key) !== null; } catch { return false; }
    },
    load(): Record<string, unknown> | null {
      try {
        const raw = getStorage().getItem(key);
        const value: unknown = raw === null ? null : JSON.parse(raw);
        return value !== null && typeof value === 'object' && !Array.isArray(value)
          ? value as Record<string, unknown> : null;
      } catch { return null; }
    },
  };
}
