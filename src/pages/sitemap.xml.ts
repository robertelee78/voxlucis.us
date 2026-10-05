import type { APIRoute } from 'astro';

export const GET: APIRoute = () => new Response(
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
  ['/', '/agents/', '/docs/getting-started/', '/security/'].map(path =>
    `<url><loc>https://voxlux.us${path}</loc></url>`).join('') +
  '</urlset>',
  { headers: { 'Content-Type': 'application/xml' } },
);
