// Read-only: validates the vanity selector and downloads bytes, never executes them.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { project, installerSourceUrl } from '../src/data/project.ts';

// GitHub's latest-release redirect names the release it chose; the site checks what it got.
const releaseAsset = new RegExp(`^${project.repository.replace(/[.]/gu, '\\.')}/releases/download/(v[^/]+)/install\\.sh$`, 'u');
const releaseApi = tag => `${project.repository.replace('https://github.com/', 'https://api.github.com/repos/')}/releases/tags/${tag}`;

export function verifyInstallerConfig(config) {
  const directive = `RedirectMatch 302 "^/install\\.sh$" "${installerSourceUrl}"`;
  const redirects = config.split('\n').map(line => line.trim()).filter(line => /^Redirect\w*\s/u.test(line) && line.includes('install'));
  assert.deepEqual(redirects, [directive], 'Apache must select exactly GitHub\'s latest-release installer, naming no version');
  assert.match(config, /<LocationMatch "\^\/install\\\.sh\$">\s*Header always set Cache-Control "no-store, max-age=0"\s*<\/LocationMatch>/u, 'installer redirect must disable stale caching');
}

export function verifyInstallerRedirect(response) {
  assert.ok([302, 307].includes(response.status), 'installer must use a temporary redirect');
  assert.equal(response.headers.get('location'), installerSourceUrl, 'installer must select GitHub\'s latest-release installer');
  assert.match(response.headers.get('cache-control') ?? '', /(?:^|,)\s*no-store(?:\s|,|$)/iu, 'installer redirect must not be stored');
}

export async function verifyInstallerTransport({ fetcher = fetch } = {}) {
  const options = () => ({ signal: AbortSignal.timeout(30000), headers: { 'accept-encoding': 'identity', 'cache-control': 'no-cache' } });
  const branded = await fetcher(`${project.site}/install.sh`, { ...options(), redirect: 'manual' });
  verifyInstallerRedirect(branded);
  const latest = await fetcher(installerSourceUrl, { ...options(), redirect: 'manual' });
  assert.ok([302, 307].includes(latest.status), 'GitHub must redirect the latest installer to a release');
  const url = latest.headers.get('location') ?? '';
  const tag = url.match(releaseAsset)?.[1];
  assert.ok(tag, `GitHub's latest installer must be a release's install.sh asset, not ${url}`);
  assert.equal(tag, project.release, `the installer gives ${tag}; the site describes ${project.release}`);
  const record = await fetcher(releaseApi(tag), { ...options(), redirect: 'follow' });
  assert.equal(record.status, 200, `GitHub's ${tag} release record must be available`);
  const asset = (await record.json()).assets?.find(entry => entry.name === 'install.sh');
  assert.ok(asset && /^sha256:[0-9a-f]{64}$/u.test(asset.digest ?? ''), `${tag} must publish install.sh with its SHA-256`);
  const source = await fetcher(url, { ...options(), redirect: 'follow' });
  assert.equal(source.status, 200, 'GitHub installer must be available');
  const bytes = Buffer.from(await source.arrayBuffer());
  assert.equal(bytes.length, asset.size, 'installer size matches the GitHub release asset');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(`sha256:${sha256}`, asset.digest, 'installer SHA-256 matches the GitHub release asset');
  return { url, tag, size: bytes.length, sha256 };
}
