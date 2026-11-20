/**
 * PWA Share Target In-Memory Stash
 * Temporarily stages files received from mobile share-sheets until client consumes them.
 * Auto-expires in 2 minutes to prevent memory leaks.
 */

export interface StashedFile {
  name: string;
  type: string;
  size: number;
  dataBase64: string;
}

export interface StashEntry {
  id: string;
  title?: string | null;
  text?: string | null;
  url?: string | null;
  files: StashedFile[];
  expiresAt: number;
}

const stashMap = new Map<string, StashEntry>();

// Clean up expired stash entries
let pwaCleanupTimer: NodeJS.Timeout | null = null;
function ensurePwaTimer() {
  if (pwaCleanupTimer) return;
  pwaCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of stashMap.entries()) {
      if (entry.expiresAt <= now) {
        stashMap.delete(id);
      }
    }
  }, 30000);
  if (typeof pwaCleanupTimer.unref === 'function') {
    pwaCleanupTimer.unref();
  }
}

export function savePwaStash(entry: Omit<StashEntry, 'expiresAt'>): string {
  ensurePwaTimer();
  const expiresAt = Date.now() + 120000; // 2 minutes
  stashMap.set(entry.id, {
    ...entry,
    expiresAt,
  });
  return entry.id;
}

export function consumePwaStash(id: string): StashEntry | null {
  const entry = stashMap.get(id);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    stashMap.delete(id);
    return null;
  }
  // Consume once
  stashMap.delete(id);
  return entry;
}
