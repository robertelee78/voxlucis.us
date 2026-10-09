import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { project, installerSourceUrl, installerSize } from '../src/data/project.ts';
import { verifyInstallerConfig, verifyInstallerRedirect, verifyInstallerTransport } from './installer-transport.mjs';

const config = await readFile(new URL('../ops/apache/voxlux.us.conf', import.meta.url), 'utf8');
const redirect = (status = 302, location = installerSourceUrl, cache = 'no-store, max-age=0') => new Response(null, { status, headers: { location, 'cache-control': cache } });

test('Apache selects the reviewed GitHub asset with no-store', () => verifyInstallerConfig(config));
test('Apache version drift fails', () => assert.throws(() => verifyInstallerConfig(config.replace(installerSourceUrl, installerSourceUrl.replace(project.release, 'v0.3.1')))));
test('Apache missing cache policy fails', () => assert.throws(() => verifyInstallerConfig(config.replace('no-store, max-age=0', 'max-age=3600'))));
test('Apache duplicate selector fails', () => assert.throws(() => verifyInstallerConfig(config + `\nRedirectMatch 302 "^/install\\.sh$" "${installerSourceUrl}"`)));
for (const status of [302, 307]) test(`temporary ${status} accepted`, () => verifyInstallerRedirect(redirect(status)));
for (const status of [200, 301, 308, 404]) test(`non-temporary ${status} refused`, () => assert.throws(() => verifyInstallerRedirect(redirect(status))));
for (const target of [installerSourceUrl.replace(`/download/${project.release}/`, '/latest/download/'), installerSourceUrl.replace(project.release, 'v0.3.1'), 'https://example.com/install.sh']) {
  test(`wrong selector refused: ${target}`, () => assert.throws(() => verifyInstallerRedirect(redirect(302, target))));
}
test('cacheable redirect refused', () => assert.throws(() => verifyInstallerRedirect(redirect(302, installerSourceUrl, 'public, max-age=3600'))));
test('missing upstream asset refused', async () => {
  let calls = 0;
  await assert.rejects(verifyInstallerTransport({ fetcher: async () => ++calls === 1 ? redirect() : new Response(null, { status: 404 }) }), /must be available/u);
  assert.equal(calls, 2);
});
test('modified installer bytes refused even at the expected size', async () => {
  let calls = 0;
  await assert.rejects(verifyInstallerTransport({ fetcher: async (_url, options) => {
    calls++;
    assert.equal(options.redirect, calls === 1 ? 'manual' : 'follow');
    return calls === 1 ? redirect() : new Response(new Uint8Array(installerSize));
  } }), /SHA-256/u);
  assert.equal(calls, 2);
});
test('truncated installer refused', async () => {
  let calls = 0;
  await assert.rejects(verifyInstallerTransport({ fetcher: async () => ++calls === 1 ? redirect() : new Response('short') }), /size matches/u);
});
