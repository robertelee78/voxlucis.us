// Read-only: validates the vanity selector and downloads bytes, never executes them.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { project, installerSourceUrl, installerSha256, installerSize } from '../src/data/project.ts';

export function verifyInstallerConfig(config) {
  const directive = `RedirectMatch 302 "^/install\\.sh$" "${installerSourceUrl}"`;
  const redirects = config.split('\n').map(line => line.trim()).filter(line => /^Redirect\w*\s/u.test(line) && line.includes('install'));
  assert.deepEqual(redirects, [directive], 'Apache must select exactly the pinned GitHub installer');
  assert.match(config, /<LocationMatch "\^\/install\\\.sh\$">\s*Header always set Cache-Control "no-store, max-age=0"\s*<\/LocationMatch>/u, 'installer redirect must disable stale caching');
}

export function verifyInstallerRedirect(response) {
  assert.ok([302, 307].includes(response.status), 'installer must use a temporary redirect');
  assert.equal(response.headers.get('location'), installerSourceUrl, 'installer must select the exact versioned GitHub asset');
  assert.match(response.headers.get('cache-control') ?? '', /(?:^|,)\s*no-store(?:\s|,|$)/iu, 'installer redirect must not be stored');
}

export async function verifyInstallerTransport({ fetcher = fetch } = {}) {
  const options = () => ({ signal: AbortSignal.timeout(30000), headers: { 'accept-encoding': 'identity', 'cache-control': 'no-cache' } });
  const branded = await fetcher(`${project.site}/install.sh`, { ...options(), redirect: 'manual' });
  verifyInstallerRedirect(branded);
  const source = await fetcher(installerSourceUrl, { ...options(), redirect: 'follow' });
  assert.equal(source.status, 200, 'GitHub installer must be available');
  const bytes = Buffer.from(await source.arrayBuffer());
  assert.equal(bytes.length, installerSize, 'installer size matches the GitHub release asset');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256, installerSha256, 'installer SHA-256 matches the reviewed GitHub release asset');
  return { url: installerSourceUrl, size: bytes.length, sha256 };
}
