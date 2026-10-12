// Mock data layer for player avatars — Vite dev/preview middleware.
//
// The mock data (src/api/client.ts, mocks/global-players.json) ships captured
// avatar URLs shaped like `/api/data/pmc_avatars/<permaLink>.png`, and
// GlobalTable.tsx renders them as <img src>. No dev asset serves those paths,
// so every avatar image used to answer 404 and log a console error before the
// onerror fallback swapped in an initials tile. This plugin answers any
// /api/data/pmc_avatars/* request with a deterministic placeholder (hue
// derived from the permaLink seed), keeping the browser console clean until
// the backend serves the real binaries (api/openapi/schema.d.ts getPlayerAvatar:
// "Avatars come from object storage later; the URL stays the same", answered
// 404 not_found with Cache-Control: public, max-age=300 — mirrored here).
//
// Config-side module (imported by astro.config.mjs): Vite types only, no DOM
// and no Node builtins, so `astro check` can verify it.

import type { Plugin, PreviewServer, ViteDevServer } from 'vite';

const AVATAR_PREFIX = '/api/data/pmc_avatars/';

/** FNV-1a over the seed → stable 0-359 hue, so a player's placeholder never
    changes between reloads while the data stays unchanged. */
function hueFor(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 360;
}

/** 64×64 dark tile with a hash-tinted silhouette, same footprint as the
    40px row avatar and readable in both themes. */
function placeholderSvg(seed: string): string {
  const hue = hueFor(seed);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" fill="#1e293b"/>` +
    `<circle cx="32" cy="25" r="11" fill="hsl(${hue} 45% 62%)"/>` +
    `<path d="M10 58a22 17 0 0 1 44 0Z" fill="hsl(${hue} 45% 62%)"/>` +
    `</svg>`
  );
}

// Vite's connect-style handler types resolve through @types/node, which this
// repo does not ship (the request type collapses to an empty interface under
// astro check). The handler therefore takes unknown and narrows structurally,
// so it stays assignable to the real middleware signature in any resolution.
interface RequestLike {
  method?: unknown;
  url?: unknown;
}

interface ResponseLike {
  writeHead(statusCode: number, headers: Record<string, string>): unknown;
  end(body?: string): unknown;
}

function isResponseLike(value: unknown): value is ResponseLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ResponseLike).writeHead === 'function' &&
    typeof (value as ResponseLike).end === 'function'
  );
}

function respond(req: unknown, res: unknown, next: () => void): void {
  if (!isResponseLike(res)) return next();
  const { method, url } = (typeof req === 'object' && req !== null ? req : {}) as RequestLike;
  if (method !== 'GET' && method !== 'HEAD') return next();
  const path = (typeof url === 'string' ? url : '').split('?')[0];
  if (!path.startsWith(AVATAR_PREFIX) || path.length === AVATAR_PREFIX.length) return next();
  // Seeds are hex permalinks in practice; drop anything XML-significant anyway.
  const seed = path.slice(AVATAR_PREFIX.length).replace(/\.png$/i, '').replace(/[<>&"']/g, '');
  res.writeHead(200, {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
  });
  res.end(method === 'HEAD' ? undefined : placeholderSvg(seed));
}

/** Vite plugin: register the middleware on both the dev server and preview. */
export function pmcAvatarPlaceholderPlugin(): Plugin {
  return {
    name: 'sptlb-mock-pmc-avatars',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(respond);
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(respond);
    },
  };
}
