import { expect, test } from "bun:test";
import {
  MOCK_MAINTENANCE_STORAGE_KEY,
  MOCK_SESSION_STORAGE_KEY,
  getSession,
  setMockMaintenance,
  setMockSession,
} from "../src/api/auth";
import sessionFixture from "../src/mocks/session.json";

test("session.json matches the legacy check_auth.php shape, logged out", () => {
  expect(sessionFixture).toEqual({
    authenticated: false,
    username: null,
    profilePicture: null,
    unreadCount: 0,
    maintenance: false,
  });
});

test("getSession() resolves the logged-out fixture when no mock flag is set", async () => {
  setMockSession(false); // isolate from other tests in this process
  const session = await getSession();
  expect(session.authenticated).toBe(false);
  expect(session.username).toBe(null);
  expect(session.unreadCount).toBe(0);
});

test("setMockSession(true) makes getSession() serve the logged-in variant", async () => {
  setMockSession(false);
  setMockSession(true);
  const session = await getSession();
  expect(session.authenticated).toBe(true);
  expect(session.username).toBe("Pilot");
  expect(session.profilePicture).toBe(null);
  expect(session.unreadCount).toBe(3);
  expect(session.maintenance).toBe(false);
});

test("setMockSession(false) clears the flag so getSession() is logged out again", async () => {
  setMockSession(true);
  expect(MOCK_SESSION_STORAGE_KEY).toBe("sptlb:mocksession");
  setMockSession(false);
  const session = await getSession();
  expect(session.authenticated).toBe(false);
  expect(session.username).toBe(null);
});

test("setMockMaintenance(true) overlays the maintenance flag for the banner", async () => {
  setMockSession(false);
  setMockMaintenance(true);
  const session = await getSession();
  expect(session.maintenance).toBe(true);
  expect(MOCK_MAINTENANCE_STORAGE_KEY).toBe("sptlb:mockmaintenance");
  setMockMaintenance(false);
  expect((await getSession()).maintenance).toBe(false);
});
