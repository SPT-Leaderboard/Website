/**
 * Unit tests for the v2 fetch client (src/api/openapi/client.ts) — Task FRT-21.
 * fetch is stubbed at the global level (no server): these tests pin the built
 * URLs, the typed ApiError on a {code, message} body, and the ETag cache
 * behavior of the two polled GET endpoints (heartbeats, seasons/current).
 */

import { expect, test } from "bun:test";
import {
  ApiError,
  deleteComment,
  getCurrentSeason,
  getHeartbeats,
  getOnlineStatus,
  getPlayerComments,
  getPlayerEquipment,
  getPlayerRaidBlob,
  getPlayerRaids,
  getSeason,
  getSeasons,
  resetEtagCache,
  sendFriendRequest,
} from "../src/api/openapi/client";

const PERMALINK = "9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0";

interface RecordedRequest {
  url: string;
  init: RequestInit | undefined;
}

/** Replaces the global fetch with a recording stub; returns the recorded calls. */
function stubFetch(serve: () => Response): RecordedRequest[] {
  const calls: RecordedRequest[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return serve();
  }) as typeof fetch;
  return calls;
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function notModified(etag: string): Response {
  return new Response(null, { status: 304, headers: { ETag: etag } });
}

function header(call: RecordedRequest, name: string): string | null {
  return new Headers(call.init?.headers).get(name);
}

test("builds relative same-origin URLs from the yaml paths on every GET", async () => {
  const calls = stubFetch(() => jsonResponse({}));
  await getOnlineStatus();
  await getSeasons();
  await getSeason(12);
  await getPlayerRaids(PERMALINK);
  await getPlayerRaidBlob(PERMALINK, 0);
  await getPlayerEquipment(PERMALINK);
  await getPlayerComments(PERMALINK);
  expect(calls.map((call) => call.url)).toEqual([
    "/api/v2/status",
    "/api/v2/seasons",
    "/api/v2/seasons/12",
    `/api/v2/players/${PERMALINK}/raids`,
    `/api/v2/players/${PERMALINK}/raids/blobs/0`,
    `/api/v2/players/${PERMALINK}/equipment`,
    `/api/v2/players/${PERMALINK}/comments`,
  ]);
  expect(calls.every((call) => call.init?.credentials === "include")).toBe(true);
});

test("throws ApiError parsed from the {code, message} body on a 404", async () => {
  stubFetch(() => jsonResponse({ code: "not_found", message: "Season not found." }, 404));
  let caught: unknown;
  try {
    await getSeason(99);
  } catch (error) {
    caught = error;
  }
  expect(caught instanceof ApiError).toBe(true);
  expect(caught instanceof Error).toBe(true);
  const apiError = caught as ApiError;
  expect(apiError.code).toBe("not_found");
  expect(apiError.message).toBe("Season not found.");
  expect(apiError.status).toBe(404);
});

test("falls back to a status-derived ApiError when the error body is not {code, message}", async () => {
  stubFetch(() => new Response("<html>gateway error</html>", { status: 502, statusText: "" }));
  let caught: unknown;
  try {
    await getOnlineStatus();
  } catch (error) {
    caught = error;
  }
  expect(caught instanceof ApiError).toBe(true);
  const apiError = caught as ApiError;
  expect(apiError.code).toBe("http_502");
  expect(apiError.status).toBe(502);
});

test("heartbeats ETag cache: sends If-None-Match and returns the cached data on 304", async () => {
  resetEtagCache();
  const v1 = { p1: { id: "p1", timestamp: 1, type: "online" } };
  let status = 200;
  let body: unknown = v1;
  let etag = '"hb-1"';
  const calls = stubFetch(() =>
    status === 304 ? notModified(etag) : jsonResponse(body, status, { ETag: etag }),
  );

  const first = await getHeartbeats();
  expect(first).toEqual(v1);
  expect(header(calls[0], "If-None-Match")).toBe(null);

  // Same ETag upstream: 304, no body — the cached object comes back verbatim.
  status = 304;
  body = null;
  const second = await getHeartbeats();
  expect(second).toBe(first);
  expect(header(calls[1], "If-None-Match")).toBe('"hb-1"');
  expect(calls[1].init?.credentials).toBe("include");

  // Upstream changed: a 200 with a new ETag refreshes the cache.
  status = 200;
  const v2 = { p1: { id: "p1", timestamp: 2, type: "raid" } };
  body = v2;
  etag = '"hb-2"';
  const third = await getHeartbeats();
  expect(third).toEqual(v2);
  expect(header(calls[2], "If-None-Match")).toBe('"hb-1"');

  status = 304;
  body = null;
  const fourth = await getHeartbeats();
  expect(fourth).toBe(third);
  expect(header(calls[3], "If-None-Match")).toBe('"hb-2"');
});

test("seasons/current ETag cache: no If-None-Match on the first call, cached data on 304", async () => {
  resetEtagCache();
  const board = { leaderboard: [{ id: "p1", name: "Pilot" }] };
  let status = 200;
  let body: unknown = board;
  let etag = '"season-1"';
  const calls = stubFetch(() =>
    status === 304 ? notModified(etag) : jsonResponse(body, status, { ETag: etag }),
  );

  const first = await getCurrentSeason();
  expect(first).toEqual(board);
  expect(header(calls[0], "If-None-Match")).toBe(null);

  status = 304;
  body = null;
  const second = await getCurrentSeason();
  expect(second).toBe(first);
  expect(header(calls[1], "If-None-Match")).toBe('"season-1"');
});

test("POST /api/v2/friend-requests sends the permaLink as a JSON body", async () => {
  const calls = stubFetch(() =>
    jsonResponse({ success: true, message: "Friend request sent successfully" }, 201),
  );
  const result = await sendFriendRequest(PERMALINK);
  expect(result.success).toBe(true);
  expect(calls[0].url).toBe("/api/v2/friend-requests");
  expect(calls[0].init?.method).toBe("POST");
  expect(calls[0].init?.body).toBe(JSON.stringify({ permaLink: PERMALINK }));
  expect(header(calls[0], "Content-Type")).toBe("application/json");
  expect(calls[0].init?.credentials).toBe("include");
});

test("DELETE /api/v2/comments/{commentId} answers 204 and resolves", async () => {
  const calls = stubFetch(() => new Response(null, { status: 204 }));
  await deleteComment("7f3a2b1c9d4e5f60");
  expect(calls[0].url).toBe("/api/v2/comments/7f3a2b1c9d4e5f60");
  expect(calls[0].init?.method).toBe("DELETE");
});
