// FRT-31: build-time robots.txt endpoint. Static output prerenders this to
// dist/robots.txt. Generated (not a public/ static file) because the sitemap
// directive must be an absolute URL per the robots.txt spec, and the repo must
// stay domain-free: the origin comes from PUBLIC_SITE_URL (src/lib/site.ts).
import type { APIRoute } from 'astro';
import { SITE_URL } from '../lib/site';

export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      '',
      `Sitemap: ${SITE_URL}/sitemap.xml`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
