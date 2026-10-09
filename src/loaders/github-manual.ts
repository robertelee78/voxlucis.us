import { createHash } from 'node:crypto';
import type { Loader } from 'astro/loaders';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { manualLinkPolicy, manualReadingPolicy, manualRoute, validateChapter, validateManifest } from './manual-policy';

const repository = 'robertelee78/vox';
const root = 'docs/manual/';
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const apiTypes = new Set(['application/json', 'application/vnd.github+json']);
const rawTypes = new Set(['text/plain', 'text/markdown', 'application/octet-stream']);

async function download(url: string, limit: number, types: Set<string>, headers: Record<string, string> = {}): Promise<Uint8Array> {
  const response = await fetch(url, { headers: { 'User-Agent': 'voxlucis.us-manual-build', ...headers }, redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Manual source request returned HTTP ${response.status}: ${url}`);
  const mediaType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!mediaType || !types.has(mediaType)) throw new Error(`Manual source returned unsupported media type: ${mediaType ?? 'missing'}`);
  const declared = response.headers.get('content-length');
  if (declared && (!Number.isSafeInteger(Number(declared)) || Number(declared) < 0 || Number(declared) > limit)) throw new Error(`Manual source exceeds ${limit} bytes`);
  if (!response.body) throw new Error('Manual source response has no body');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error(`Manual source exceeds ${limit} bytes`);
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}

function decode(bytes: Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('Manual source is not valid UTF-8'); }
}

function json(bytes: Uint8Array): unknown {
  try { return JSON.parse(decode(bytes)); }
  catch { throw new Error('Manual source returned invalid UTF-8 or JSON'); }
}

export function githubManualLoader(): Loader {
  return {
    name: 'vox-canonical-manual',
    async load({ store, parseData, logger }) {
      const sourceRef = process.env.VOX_MANUAL_REF?.trim() || 'main';
      if (sourceRef.length > 200 || /[\x00-\x20\x7f]/.test(sourceRef)) throw new Error('Invalid VOX_MANUAL_REF');
      const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
      if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      // The SHA media type excludes file diffs, so unrelated large code commits cannot
      // exhaust the metadata bound. Resolve the moving ref exactly once.
      const sourceCommit = decode(await download(`https://api.github.com/repos/${repository}/commits/${encodeURIComponent(sourceRef)}`, 128, new Set(['application/vnd.github.sha', 'text/plain']), { ...headers, Accept: 'application/vnd.github.sha' })).trim();
      if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error('GitHub returned an invalid manual revision');
      const metadata = json(await download(`https://api.github.com/repos/${repository}/git/commits/${sourceCommit}`, 128 * 1024, apiTypes, headers)) as { sha?: unknown; committer?: { date?: unknown } };
      const sourceUpdatedAt = metadata?.committer?.date;
      if (metadata?.sha !== sourceCommit) throw new Error('GitHub returned a different manual revision');
      if (typeof sourceCommit !== 'string' || !/^[a-f0-9]{40}$/.test(sourceCommit) || typeof sourceUpdatedAt !== 'string' || !Number.isFinite(Date.parse(sourceUpdatedAt))) throw new Error('GitHub returned invalid manual revision metadata');
      const rawRoot = `https://raw.githubusercontent.com/${repository}/${sourceCommit}/${root}`;
      const sourceRoot = `https://github.com/${repository}/blob/${sourceCommit}/${root}`;
      const manifestBytes = await download(rawRoot + 'manifest.json', 64 * 1024, rawTypes);
      const pages = validateManifest(json(manifestBytes));
      const manifestSha256 = sha256(manifestBytes);
      // Remote fences use the native escaped-code path. A highlighter is unnecessary
      // for reading commands and must never reinterpret fence contents as HTML.
      const renderer = await createSatteriMarkdownProcessor({ syntaxHighlight: false, smartypants: false, features: { frontmatter: false }, mdastPlugins: [manualLinkPolicy(pages, sourceCommit)], hastPlugins: [manualReadingPolicy] });
      const entries = [];
      let total = manifestBytes.byteLength;
      // Sequential bounded fetches avoid multiplying response buffers or GitHub load.
      for (const [order, page] of pages.entries()) {
        const bytes = await download(rawRoot + page.path, 256 * 1024, rawTypes);
        total += bytes.byteLength;
        if (total > 2 * 1024 * 1024) throw new Error('Manual exceeds the 2 MiB total source limit');
        const body = decode(bytes);
        const sourceUrl = sourceRoot + page.path;
        validateChapter(body, page, new URL(sourceUrl), pages, sourceCommit);
        const result = await renderer.render(body, { fileURL: new URL(sourceUrl) });
        const sourceSha256 = sha256(bytes);
        const data = await parseData({ id: page.slug, data: { ...page, order, route: manualRoute(page.slug), sourceRef, sourceCommit, sourceUpdatedAt, sourceUrl, sourceSha256, sourceByteLength: bytes.byteLength, manifestSha256 } });
        entries.push({ id: page.slug, data, body, digest: sourceSha256, rendered: { html: result.code, metadata: { headings: result.metadata.headings } } });
      }
      // Resolve every local fragment against the actual rendered heading IDs before publishing.
      const routes = new Map(entries.map(entry => [entry.data.route, new Set([...entry.rendered.html.matchAll(/\bid="([^"<>]+)"/g)].map(match => match[1]))]));
      for (const entry of entries) {
        for (const match of entry.rendered.html.matchAll(/\bhref="([^"<>]+)"/g)) {
          const url = new URL(match[1].replaceAll('&amp;', '&'), `https://voxlucis.us${entry.data.route}`);
          if (url.origin !== 'https://voxlucis.us' || !url.pathname.startsWith('/docs/manual/')) continue;
          const ids = routes.get(url.pathname);
          if (!ids || (url.hash && !ids.has(decodeURIComponent(url.hash.slice(1))))) throw new Error(`${entry.id}: missing manual chapter or fragment ${url.pathname}${url.hash}`);
        }
      }
      // Never partially replace a previously valid collection after a source failure.
      store.clear();
      entries.forEach(entry => store.set(entry));
      logger.info(`Loaded ${pages.length} manual chapters from ${sourceRef}@${sourceCommit.slice(0, 12)} (${total} bytes)`);
    },
  };
}
