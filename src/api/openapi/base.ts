/**
 * Base URL of the v2 website API (backend OpenAPI draft, docs/api/openapi.yaml
 * — read-only authority; versioned by the yaml's info.version).
 *
 * The value is injected at build time via the PUBLIC_API_BASE_URL environment
 * variable (Astro exposes PUBLIC_* vars on import.meta.env during
 * `astro dev`/`astro build`; see .env.example at the repo root). Unset or
 * empty (the default) means the data layer serves the mock fixtures
 * (src/api/client.ts); any other value switches the stub client to the real
 * v2 API at that base URL (REAL_API_ENABLED below) and is used as the fetch
 * base. A trailing slash is stripped so base + path stays well-formed.
 */

const rawApiBase: string | undefined = import.meta.env.PUBLIC_API_BASE_URL;

/** API base without a trailing slash ("" = same origin, relative URLs). */
export const API_BASE: string = (rawApiBase ?? "").replace(/\/+$/, "");

/**
 * The mock/real switch of the data layer (src/api/client.ts): false (the
 * default — no PUBLIC_API_BASE_URL) = bundled fixtures; true = the real v2
 * API at API_BASE.
 */
export const REAL_API_ENABLED: boolean = (rawApiBase ?? "") !== "";
