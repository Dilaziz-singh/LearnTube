const NAMESPACE = 'lt';

function makeKey(key: string): string {
  return `${NAMESPACE}:${key}`;
}

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    const namespacedKey = makeKey(key);
    const result = await chrome.storage.local.get(namespacedKey);
    return (result[namespacedKey] as T) ?? null;
  },

  async set<T>(key: string, value: T): Promise<void> {
    const namespacedKey = makeKey(key);
    await chrome.storage.local.set({ [namespacedKey]: value });
  },

  async remove(key: string): Promise<void> {
    const namespacedKey = makeKey(key);
    await chrome.storage.local.remove(namespacedKey);
  },

  async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    const namespacedKeys = keys.map(makeKey);
    const result = await chrome.storage.local.get(namespacedKeys);
    const output: Record<string, T | null> = {};
    for (const key of keys) {
      output[key] = (result[makeKey(key)] as T) ?? null;
    }
    return output;
  },

  async getAllWithPrefix<T>(prefix: string): Promise<Record<string, T>> {
    const all = await chrome.storage.local.get(null);
    const namespacedPrefix = makeKey(prefix);
    const output: Record<string, T> = {};
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith(namespacedPrefix)) {
        const cleanKey = key.replace(`${NAMESPACE}:`, '');
        output[cleanKey] = value as T;
      }
    }
    return output;
  },

  async clear(): Promise<void> {
    const all = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(all).filter(k => k.startsWith(`${NAMESPACE}:`));
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }
  },
};
