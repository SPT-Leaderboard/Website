// FRT-31: build-time sitemap.xml endpoint (ux-audit §5: machine-readable /sitemap.xml).
// Static output prerenders this to dist/sitemap.xml, which is exactly the file the
// BaseLayout footer's "Sitemap" link (/sitemap.xml, FRT-10 legal row) points at.
import type { APIRoute } from 'astro';
import { SITE_URL } from '../lib/site';

// lastmod = build date, W3C short date (YYYY-MM-DD) as the sitemap protocol requires.
const LASTMOD: string = new Date().toISOString().slice(0, 10);

// The real page routes only. Profile modals, hash routes and anything behind
// auth are client-side state, not prerendered routes, so they are deliberately absent.
const ROUTES: readonly string[] = ['/', '/global/', '/insights/', '/meta/', '/achievements/', '/tos/', '/privacy/'];

/** Escape a URL for safe embedding in an XML text node. */
function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function urlEntry(route: string): string {
  const loc = new URL(route, `${SITE_URL}/`).href;
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n  </url>`;
}

export const GET: APIRoute = () =>
  new Response(
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...ROUTES.map(urlEntry),
      '</urlset>',
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'application/xml' } },
  );
