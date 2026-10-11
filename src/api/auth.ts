/**
 * Mock session client (FRT-19).
 *
 * Stands in for the Network session check until the real backend lands
 * (FRT-22). The legacy check (`js/api-auth.js` `checkAuth()`) did a
 * cookie-authenticated GET to `/api/network/login/check_auth.php` that
 * returned `{authenticated, username, profilePicture, unreadCount,
 * maintenance}` (docs/port/data-dependency-map.md #5). The response shape
 * is kept identical; the data comes from the synthesized
 * `src/mocks/session.json` fixture instead of the network. The real fetch
 * client replaces this module later without changing these signatures.
 */

import sessionFixture from "../mocks/session.json";

/** One Network session check response — legacy check_auth.php shape. */
export interface Session {
  authenticated: boolean;
  username: string | null;
  profilePicture: string | null;
  unreadCount: number;
  maintenance: boolean;
}

/** Dev-only flag key: `setMockSession(true)` makes getSession() serve the logged-in variant. */
export const MOCK_SESSION_STORAGE_KEY = "sptlb:mocksession";

/** Dev-only flag key for the maintenance banner variant, same pattern as the session flag. */
export const MOCK_MAINTENANCE_STORAGE_KEY = "sptlb:mockmaintenance";

/** The logged-in variant served while MOCK_SESSION_STORAGE_KEY is "true". */
const LOGGED_IN_VARIANT: Session = {
  authenticated: true,
  username: "Pilot",
  profilePicture: null,
  unreadCount: 3,
  maintenance: false,
};

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// localStorage is browser-only: bun test and the Astro SSR pass have neither,
// so flag reads/writes fall back to an in-memory map there.
const memoryStorage = new Map<string, string>();
const storage: StorageLike =
  typeof localStorage === "undefined"
    ? {
        getItem: (key) => memoryStorage.get(key) ?? null,
        setItem: (key, value) => void memoryStorage.set(key, value),
        removeItem: (key) => void memoryStorage.delete(key),
      }
    : localStorage;

function readFlag(key: string): boolean {
  return storage.getItem(key) === "true";
}

/** Writes the dev mock-session flag; `false` clears it (the logged-out default). */
export function setMockSession(loggedIn: boolean): void {
  if (loggedIn) storage.setItem(MOCK_SESSION_STORAGE_KEY, "true");
  else storage.removeItem(MOCK_SESSION_STORAGE_KEY);
}

/** Same pattern as setMockSession(), for the maintenance banner variant. */
export function setMockMaintenance(underMaintenance: boolean): void {
  if (underMaintenance) storage.setItem(MOCK_MAINTENANCE_STORAGE_KEY, "true");
  else storage.removeItem(MOCK_MAINTENANCE_STORAGE_KEY);
}

/** Random 0-300 ms latency, as if the data came over the network. */
function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * 300));
}

/**
 * Resolves the session check. Serves the synthesized logged-out fixture, or
 * the logged-in variant while the mock-session flag is set; the mock
 * maintenance flag (default false) overlays both.
 */
export async function getSession(): Promise<Session> {
  await delay();
  const maintenance = readFlag(MOCK_MAINTENANCE_STORAGE_KEY);
  if (readFlag(MOCK_SESSION_STORAGE_KEY)) {
    return { ...LOGGED_IN_VARIANT, maintenance };
  }
  return { ...sessionFixture, maintenance };
}
