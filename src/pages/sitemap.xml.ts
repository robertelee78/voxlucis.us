import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => new Response(
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
  ['/', '/agents/', '/docs/getting-started/', '/security/', ...(await getCollection('manual')).sort((a, b) => a.data.order - b.data.order).map(page => page.data.route)].map(path =>
    `<url><loc>https://voxlucis.us${path}</loc></url>`).join('') +
  '</urlset>',
  { headers: { 'Content-Type': 'application/xml' } },
);
