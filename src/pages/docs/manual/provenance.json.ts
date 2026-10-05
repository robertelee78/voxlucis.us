import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const pages = (await getCollection('manual')).sort((a, b) => a.data.order - b.data.order);
  const source = pages[0].data;
  return new Response(JSON.stringify({ schemaVersion: 1, repository: 'robertelee78/vox', sourceRef: source.sourceRef, sourceCommit: source.sourceCommit, sourceUpdatedAt: source.sourceUpdatedAt, manifestSha256: source.manifestSha256, pages: pages.map(({ data }) => ({ slug: data.slug, path: data.path, title: data.title, appliesTo: data.appliesTo, route: data.route, sourceUrl: data.sourceUrl, sourceSha256: data.sourceSha256, sourceByteLength: data.sourceByteLength })) }, null, 2) + '\n', { headers: { 'Content-Type': 'application/json' } });
};
