// FRT-31: single source of the site origin (ux-audit §5 / §6.8 "legal + discovery").
// The origin is injected at build time via the PUBLIC_SITE_URL environment variable
// (Astro exposes PUBLIC_* vars on import.meta.env during `astro build`). No domain is
// hard-coded anywhere in the repo. When the variable is unset — local dev and preview —
// the fallback is Astro's default localhost origin.
const LOCALHOST_FALLBACK = 'http://localhost:4321';

const rawSiteUrl: string | undefined = import.meta.env.PUBLIC_SITE_URL;

/** Site origin without a trailing slash (scheme + host, no path). */
export const SITE_URL: string = (rawSiteUrl ?? LOCALHOST_FALLBACK).replace(/\/+$/, '');
