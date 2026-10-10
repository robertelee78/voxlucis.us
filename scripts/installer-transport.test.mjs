import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { project, installerSourceUrl } from '../src/data/project.ts';
import { verifyInstallerConfig, verifyInstallerRedirect, verifyInstallerTransport } from './installer-transport.mjs';

const config = await readFile(new URL('../ops/apache/voxlucis.us.conf', import.meta.url), 'utf8');
const pinned = `${project.repository}/releases/download/${project.release}/install.sh`;
const redirect = (status = 302, location = installerSourceUrl, cache = 'no-store, max-age=0') => new Response(null, { status, headers: { location, 'cache-control': cache } });
const script = new TextEncoder().encode('#!/bin/sh\necho reviewed\n');
const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
// GitHub as the site sees it: the branded 302, latest's 302 to a tag, the tag's record, the bytes.
const github = ({ tag = project.release, bytes = script, asset = { name: 'install.sh', size: script.length, digest: digest(script) }, assetStatus = 200 } = {}) => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push([url, options.redirect]);
    if (url === `${project.site}/install.sh`) return redirect();
    if (url === installerSourceUrl) return redirect(302, `${project.repository}/releases/download/${tag}/install.sh`, 'no-cache');
    if (url.includes('api.github.com')) return Response.json({ tag_name: tag, assets: [asset] });
    return assetStatus === 200 ? new Response(bytes) : new Response(null, { status: assetStatus });
  };
  return { fetcher, calls };
};

test('Apache selects GitHub\'s latest installer with no-store', () => verifyInstallerConfig(config));
test('Apache pinned to a version fails', () => assert.throws(() => verifyInstallerConfig(config.replace(installerSourceUrl, pinned))));
test('Apache missing cache policy fails', () => assert.throws(() => verifyInstallerConfig(config.replace('no-store, max-age=0', 'max-age=3600'))));
test('Apache duplicate selector fails', () => assert.throws(() => verifyInstallerConfig(config + `\nRedirectMatch 302 "^/install\\.sh$" "${installerSourceUrl}"`)));
for (const status of [302, 307]) test(`temporary ${status} accepted`, () => verifyInstallerRedirect(redirect(status)));
for (const status of [200, 301, 308, 404]) test(`non-temporary ${status} refused`, () => assert.throws(() => verifyInstallerRedirect(redirect(status))));
for (const target of [pinned, 'https://example.com/install.sh']) {
  test(`wrong selector refused: ${target}`, () => assert.throws(() => verifyInstallerRedirect(redirect(302, target))));
}
test('cacheable redirect refused', () => assert.throws(() => verifyInstallerRedirect(redirect(302, installerSourceUrl, 'public, max-age=3600'))));
test('the latest release\'s installer, as published, is accepted', async () => {
  const { fetcher, calls } = github();
  assert.deepEqual(await verifyInstallerTransport({ fetcher }), { url: pinned, tag: project.release, size: script.length, sha256: digest(script).slice(7) });
  assert.deepEqual(calls.map(([, mode]) => mode), ['manual', 'manual', 'follow', 'follow']);
});
test('a newer release than the site describes refused', async () => {
  await assert.rejects(verifyInstallerTransport(github({ tag: 'v9.9.9' })), /the site describes/u);
});
test('missing upstream asset refused', async () => {
  await assert.rejects(verifyInstallerTransport(github({ assetStatus: 404 })), /must be available/u);
});
test('modified installer bytes refused even at the expected size', async () => {
  await assert.rejects(verifyInstallerTransport(github({ bytes: new Uint8Array(script.length) })), /SHA-256/u);
});
test('truncated installer refused', async () => {
  await assert.rejects(verifyInstallerTransport(github({ bytes: script.slice(0, 5) })), /size matches/u);
});
test('a release with no published digest refused', async () => {
  await assert.rejects(verifyInstallerTransport(github({ asset: { name: 'install.sh', size: script.length } })), /SHA-256/u);
});
