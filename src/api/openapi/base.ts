/**
 * Base URL of the v2 website API (backend OpenAPI draft, docs/api/openapi.yaml
 * — read-only authority; versioned by the yaml's info.version).
 *
 * The value is injected at build time via the PUBLIC_API_BASE environment
 * variable (Astro exposes PUBLIC_* vars on import.meta.env during
 * `astro build`). The empty-string default means same origin: request URLs
 * stay relative and hit the site that served the page (api-design.md rule 3,
 * `/api/v2` prefix on the same host).
 */

const rawApiBase: string | undefined = import.meta.env.PUBLIC_API_BASE;

/** API base without a trailing slash ("" = same origin, relative URLs). */
export const API_BASE: string = (rawApiBase ?? "").replace(/\/+$/, "");
