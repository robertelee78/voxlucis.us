// Read-only verification of the published artifact against this local dist/.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { verifyInstallerTransport } from './installer-transport.mjs';

const origin = 'https://voxlucis.us';
const root = path.resolve('dist');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = await readdir(root, { recursive: true, withFileTypes: true });
const artifacts = files.filter(entry => entry.isFile()).map(entry => path.relative(root, path.join(entry.parentPath, entry.name)));
assert.ok(artifacts.length > 0, 'artifact is not empty');
for (const file of artifacts.sort()) {
  const route = '/' + file.replace(/index\.html$/u, '');
  const response = await fetch(origin + route, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  assert.equal(response.status, 200, `${route}: HTTP 200`);
  const actual = hash(Buffer.from(await response.arrayBuffer()));
  const expected = hash(await readFile(path.join(root, file)));
  assert.equal(actual, expected, `${route}: public bytes match the tested artifact`);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  console.log(`MATCH ${route} ${actual}`);
}
// The canonical host's own variants, and the old domain voxlux.us, which keeps every existing link
// and `curl …/install.sh` working by a permanent redirect to the same path here.
const moved = ['http://voxlucis.us/', 'https://www.voxlucis.us/', 'http://www.voxlucis.us/',
  'http://voxlux.us/', 'https://voxlux.us/', 'http://www.voxlux.us/', 'https://www.voxlux.us/'];
for (const from of moved) {
  const response = await fetch(from, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 301, `${from}: permanent redirect`);
  assert.equal(response.headers.get('location'), origin + '/');
  console.log(`PASS canonical redirect ${from}`);
}
const oldInstaller = await fetch('https://voxlux.us/install.sh', { redirect: 'manual', signal: AbortSignal.timeout(30000) });
assert.equal(oldInstaller.status, 301, 'https://voxlux.us/install.sh: permanent redirect');
assert.equal(oldInstaller.headers.get('location'), origin + '/install.sh', 'the old installer address keeps its path');
console.log('PASS old installer address https://voxlux.us/install.sh -> ' + origin + '/install.sh');
const missing = await fetch(origin + '/__voxlucis_missing_page_check__', { signal: AbortSignal.timeout(30000) });
assert.equal(missing.status, 404, 'unknown route retains HTTP 404');
assert.equal(hash(Buffer.from(await missing.arrayBuffer())), hash(await readFile(path.join(root, '404.html'))), 'custom 404 is the tested page');
console.log(`Published verification: ${artifacts.length} matching files, ${moved.length + 1} redirects to the canonical host, and the custom 404.`);
const installer = await verifyInstallerTransport();
console.log(`PASS installer: non-cached temporary redirect to GitHub's latest, ${installer.url} (${installer.tag}, the release the site describes); ${installer.size} bytes; SHA-256 ${installer.sha256}. Script downloaded, never executed.`);
