// Runs against the built Astro preview using an isolated agent-browser Chromium session.
// Requires agent-browser on PATH. No browser/test dependencies enter the shipped site.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.VOX_TEST_URL ?? 'http://127.0.0.1:4322';
const session = process.env.VOX_BROWSER_SESSION ?? `vox-regression-${process.pid}`;
const cli = (...args) => execFileSync('agent-browser', ['--session', session, ...args], { encoding: 'utf8', timeout: 60000 });
let socket;
let count = 0;
const check = (name, condition) => { assert.ok(condition, `PRODUCT: ${name}`); count++; console.log(`PASS ${name}`); };
try {
  cli('open', base);
  const endpoint = cli('get', 'cdp-url').trim();
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  let browserSession;
  const requests = new Map();
  const errors = [];
  const resources = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const handler = requests.get(message.id);
      if (!handler) return;
      requests.delete(message.id);
      clearTimeout(handler.timer);
      if (message.error) handler.reject(new Error(JSON.stringify(message.error)));
      else handler.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Network.responseReceived') resources.push(message.params.response);
  };
  const send = (method, params = {}, attached = true) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { requests.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    requests.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(attached && browserSession ? { sessionId: browserSession } : {}) }));
  });
  const targets = await send('Target.getTargets', {}, false);
  const target = targets.targetInfos.find(item => item.type === 'page' && item.url.startsWith(base));
  assert.ok(target, 'isolated test page exists');
  browserSession = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }, false)).sessionId;
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async expression => {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`Browser condition timed out: ${expression}`);
  };
  const navigate = async (path = '/') => {
    await send('Page.navigate', { url: base + path });
    await waitFor(`location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete'`);
    await waitFor(`!document.querySelector('.menu-toggle')?.hidden`);
  };
  const viewport = (width, height = 1000) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const visiblePanel = () => evaluate(`document.querySelector('[data-panel]:not([hidden])')?.dataset.panel`);
  const noOverflow = async () => {
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const layout = await evaluate(`({width: innerWidth, scroll: document.documentElement.scrollWidth, clipped: [...document.querySelectorAll('.experience, .app-window, .app-workspace, [data-panel]:not([hidden]), .room-main, .timeline, .room-inspector, .keyring-layout, .service-study')].filter(el => el.getClientRects().length && el.scrollWidth > el.clientWidth + 1).map(el => ({element: el.className, width: el.clientWidth, scroll: el.scrollWidth}))})`);
    const fits = layout.scroll <= layout.width && layout.clipped.length === 0;
    if (!fits) console.error('Overflow diagnostic:', JSON.stringify(layout));
    return fits;
  };

  await viewport(1440);
  await navigate();
  check('the study says it is illustrative, before the study', await evaluate(`document.querySelector('.study-disclaimer').textContent.includes('not a live Vox connection')`));
  check('room is the default view', await visiblePanel() === 'room');
  check('requested alias appears consistently', await evaluate(`document.querySelector('.app-identity strong').textContent === 'robertGPT' && document.querySelector('.own-message').textContent.includes('as robertGPT') && document.querySelector('#view-keyring').textContent.includes('robertGPT → ann') && document.querySelector('.app-status').textContent.includes('robertGPT') && !document.querySelector('[data-experience]').textContent.match(/\\brob\\b/i)`));
  check('unknown node has no invented timeline plaintext', await evaluate(`!document.querySelector('.timeline').textContent.includes('K2M9') && document.querySelector('.member-list').textContent.includes('K2M9')`));
  await click('[data-open-view="keyring"]');
  check('room opens keyring and transfers focus', await visiblePanel() === 'keyring' && await evaluate(`document.activeElement.id === 'tab-keyring'`));
  await click('.trust-detail summary');
  check('removal consequences disclose live-session and retained-copy limits', await evaluate(`document.querySelector('#view-keyring details').open && document.querySelector('#view-keyring details').textContent.includes('live sessions') && document.querySelector('#view-keyring details').textContent.includes('cannot be taken back')`));
  await evaluate(`document.querySelector('#tab-keyring').focus()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  check('ArrowRight selects Services', await visiblePanel() === 'services' && await evaluate(`document.activeElement.id === 'tab-services'`));
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
  check('Home selects Room', await visiblePanel() === 'room');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'End', code: 'End', windowsVirtualKeyCode: 35 });
  check('End selects Services', await visiblePanel() === 'services');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  check('arrow navigation wraps', await visiblePanel() === 'room');
  await click('[data-open-view="services"]');
  check('room service action opens the copy box', await visiblePanel() === 'services');
  check('one selected tab and one visible panel', await evaluate(`document.querySelectorAll('[role="tab"][aria-selected="true"]').length === 1 && document.querySelectorAll('[data-panel]:not([hidden])').length === 1`));
  await evaluate(`Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async text => { window.__copiedExample = text; } })`);
  await click('#view-services [data-copy]');
  await waitFor(`document.querySelector('#copy-status').textContent.includes('copied')`);
  check('copy passes only the example command and announces success', await evaluate(`window.__copiedExample === 'ssh robertGPT@nas-ssh.nas.family.vox' && document.querySelector('#view-services .copy-button span').textContent === 'Copied'`));
  await evaluate(`Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async () => { throw new DOMException('Denied', 'NotAllowedError'); } })`);
  await click('#view-services [data-copy]');
  await waitFor(`document.querySelector('#copy-status').textContent.includes('unavailable')`);
  check('denied clipboard selects printed text and never claims copied', await evaluate(`getSelection().toString() === 'ssh robertGPT@nas-ssh.nas.family.vox' && document.querySelector('#view-services .copy-button span').textContent === 'Select text'`));

  for (const width of [1440, 1024, 768, 390, 320]) {
    await viewport(width);
    for (const panel of ['room', 'keyring', 'services']) {
      await click(`[data-view="${panel}"]`);
      check(`${panel} fits ${width}px`, await noOverflow());
    }
  }
  await click('.menu-toggle');
  check('mobile menu opens', await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'true' && getComputedStyle(document.querySelector('#primary-nav')).display !== 'none'`));
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  check('Escape closes menu and restores focus', await evaluate(`document.querySelector('.menu-toggle').getAttribute('aria-expanded') === 'false' && document.activeElement.classList.contains('menu-toggle')`));

  await navigate('/agents/');
  await viewport(1440);
  check('Agents navigation identifies the current page', await evaluate(`document.querySelector('#primary-nav a[aria-current="page"]').textContent === 'Agents'`));
  check('agent guide names the release and its one-command setup', await evaluate(`document.querySelector('#setup .callout').textContent.includes('v0.4.0') && document.querySelector('#setup .callout').textContent.includes('vox setup') && document.querySelector('#setup a[href="/docs/getting-started/#agents"]') !== null`));
  check('agent guide states Codex delivery, addressing and claim limits', await evaluate(`document.querySelector('#delivery').textContent.includes('does not interrupt Codex') && document.querySelector('#delivery').textContent.includes('Addressing is not a private message') && document.querySelector('#workflow').textContent.includes('messages, not hard locks')`));
  await evaluate(`document.querySelector('.agent-setup summary').focus()`);
  // Native details activation also needs the keypress event; use the browser's full key sequence.
  cli('press', 'Enter');
  await waitFor(`document.querySelector('.agent-setup').open`);
  check('agent setup expands with the keyboard', await evaluate(`document.querySelector('.agent-setup').open && document.querySelector('.agent-setup pre').textContent.includes('vox agent plugin claude --node claude-mbp')`));
  await evaluate(`Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async text => { window.__copiedSetup = text; } })`);
  await click('.agent-setup [data-copy]');
  await waitFor(`document.querySelector('#copy-status').textContent.includes('copied')`);
  check('agent setup copies the printed node-bound configuration commands', await evaluate(`window.__copiedSetup === 'vox node create claude-mbp\\nvox agent plugin claude --node claude-mbp\\nvox agent skill claude'`));
  for (const width of [1440, 768, 390, 320]) {
    await viewport(width);
    await evaluate(`document.querySelectorAll('.agent-setup').forEach(el => el.open = true)`);
    check(`all agent setups fit ${width}px`, await noOverflow());
  }

  for (const path of ['/', '/agents/', '/docs/getting-started/', '/security/', '/404.html']) {
    await navigate(path);
    for (const width of [1440, 768, 320]) {
      await viewport(width);
      await evaluate(`document.documentElement.style.fontSize = '200%'`);
      if (path === '/agents/') await evaluate(`document.querySelectorAll('.agent-setup').forEach(el => el.open = true)`);
      if (path === '/') {
        for (const panel of ['room', 'keyring', 'services']) {
          await click(`[data-view="${panel}"]`);
          check(`${panel} fits ${width}px with 200% text`, await noOverflow());
        }
      } else check(`${path} fits ${width}px with 200% text`, await noOverflow());
      await evaluate(`document.documentElement.style.fontSize = ''`);
    }
    check(`${path} has one h1 and a skip target`, await evaluate(`document.querySelectorAll('h1').length === 1 && !!document.querySelector('#content')`));
  }

  // Read the real build, not a fixture manual; navigation and applicability derive upstream.
  const manualResponse = await fetch(base + '/docs/manual/provenance.json');
  assert.ok(manualResponse.ok, 'APPARATUS: preview must serve the built manual provenance');
  const manual = await manualResponse.json();
  check('manual exposes its source revision and nonempty chapter list', /^[a-f0-9]{40}$/.test(manual.sourceCommit) && manual.pages.length > 0);
  for (const chapter of manual.pages) {
    await navigate(chapter.route);
    check(`${chapter.slug}: reader sees the right chapter, version, source and selected navigation`, await evaluate(`document.querySelectorAll('h1').length === 1 && document.querySelector('h1').textContent === ${JSON.stringify(chapter.title)} && document.querySelector('[data-applicability]').dataset.applicability === ${JSON.stringify(chapter.appliesTo)} && document.querySelector('[data-manual-content]').dataset.sourceCommit === ${JSON.stringify(manual.sourceCommit)} && document.querySelector('[aria-label="Manual chapters"] [aria-current="page"]').getAttribute('href') === ${JSON.stringify(chapter.route)}`));
    for (const width of [1440, 320]) {
      await viewport(width);
      await evaluate(`document.documentElement.style.fontSize = '200%'`);
      check(`${chapter.slug}: reading reflows at ${width}px with 200% text`, await noOverflow());
      await evaluate(`document.documentElement.style.fontSize = ''`);
    }
  }
  await navigate('/docs/manual/');
  await viewport(320);
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await evaluate(`document.querySelector('.manual-read-link').focus()`);
  cli('press', 'Enter');
  await waitFor(`location.hash === '#chapter'`);
  check('mobile keyboard shortcut reaches the chapter before the long navigation', await evaluate(`document.activeElement.id === 'chapter' && document.querySelector('#chapter').getBoundingClientRect().top >= 0 && document.querySelector('#chapter').getBoundingClientRect().top < 120`));
  const next = manual.pages[1];
  if (next) {
    await evaluate(`document.querySelector('.manual-pagination [rel="next"]').focus()`);
    cli('press', 'Enter');
    await waitFor(`location.pathname === ${JSON.stringify(next.route)} && document.readyState === 'complete'`);
    check('keyboard next-chapter navigation reaches the linked instructions', await evaluate(`document.querySelector('h1').textContent === ${JSON.stringify(next.title)}`));
  }
  await navigate('/docs/manual/install/');
  await evaluate(`Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async text => { window.__copiedManual = text; } })`);
  await click('.manual-code [data-copy]');
  await waitFor(`document.querySelector('#copy-status').textContent.includes('copied')`);
  check('manual copy includes exactly the visible command, without Markdown or line numbers', await evaluate(`window.__copiedManual === document.querySelector('.manual-code pre').textContent && document.querySelector('.manual-code .copy-button span').textContent === 'Copied'`));
  await evaluate(`Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: async () => { throw new DOMException('Denied', 'NotAllowedError'); } })`);
  await click('.manual-code [data-copy]');
  await waitFor(`document.querySelector('#copy-status').textContent.includes('unavailable')`);
  // Selection.toString() omits the rendered terminal newline; Range preserves the
  // selected DOM bytes, which must still equal the complete printed example.
  check('manual denied clipboard leaves selectable printed text', await evaluate(`getSelection().rangeCount === 1 && getSelection().getRangeAt(0).toString() === document.querySelector('.manual-code pre').textContent && document.querySelector('.manual-code .copy-button span').textContent === 'Select text'`));
  await send('Emulation.setEmulatedMedia', { media: 'print' });
  check('printed manual retains prose while removing navigation and copy controls', await evaluate(`getComputedStyle(document.querySelector('.manual-sidebar')).display === 'none' && getComputedStyle(document.querySelector('.manual-code .copy-button')).display === 'none' && getComputedStyle(document.querySelector('[data-manual-content]')).display !== 'none'`));
  await send('Emulation.setEmulatedMedia', { media: '', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await navigate('/docs/getting-started/');
  for (const anchor of ['install', 'identity', 'first-room', 'trust', 'anchors', 'tunnels', 'agents', 'updates']) {
    check(`legacy bookmark #${anchor} leads to canonical instructions`, await evaluate(`document.querySelector(${JSON.stringify('#' + anchor + ' a')})?.getAttribute('href').startsWith('/docs/manual/')`));
  }
  await navigate();
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  check('reduced motion disables smooth scrolling', await evaluate(`getComputedStyle(document.documentElement).scrollBehavior === 'auto'`));
  check('build loads no third-party resources', resources.every(resource => new URL(resource.url).origin === new URL(base).origin));
  check('no failing page/asset requests', resources.every(resource => resource.status < 400));
  check('no browser runtime exceptions', errors.length === 0);

  await send('Emulation.setScriptExecutionDisabled', { value: true });
  await send('Page.reload', { ignoreCache: true });
  // Runtime.evaluate remains a debugging command while page scripts are disabled.
  await waitFor(`document.readyState === 'complete' && document.querySelector('.menu-toggle')?.hidden === true`);
  check('no-JS navigation and room content remain visible', await evaluate(`getComputedStyle(document.querySelector('#primary-nav')).display !== 'none' && !document.querySelector('#view-room').hidden && !!document.querySelector('noscript')`));
  check('no-JS inert study and copy buttons stay hidden', await evaluate(`document.querySelector('[data-view-tabs]').hidden && [...document.querySelectorAll('[data-copy], [data-open-view]')].every(button => button.hidden)`));
  await send('Page.navigate', { url: base + '/agents/' });
  await waitFor(`location.pathname === '/agents/' && document.readyState === 'complete'`);
  await evaluate(`document.querySelector('.agent-setup summary').click()`);
  check('agent setup remains readable without JavaScript', await evaluate(`document.querySelector('.agent-setup').open && document.querySelector('.agent-setup pre').textContent.includes('--node claude-mbp') && document.querySelector('.agent-setup [data-copy]').hidden`));
  await send('Page.navigate', { url: base + '/docs/manual/install/' });
  await waitFor(`location.pathname === '/docs/manual/install/' && document.readyState === 'complete'`);
  check('manual reading and all chapter navigation work without JavaScript', await evaluate(`!!document.querySelector('h1') && document.querySelectorAll('[aria-label="Manual chapters"] a').length === ${manual.pages.length} && getComputedStyle(document.querySelector('[data-manual-content]')).display !== 'none' && [...document.querySelectorAll('.manual-code [data-copy]')].every(button => button.hidden)`));
  await evaluate(`document.querySelector('.manual-pagination [rel="next"]').focus()`);
  cli('press', 'Enter');
  await waitFor(`location.pathname !== '/docs/manual/install/' && document.readyState === 'complete'`);
  check('no-JS keyboard navigation reaches the next full chapter', await evaluate(`!!document.querySelector('[data-manual-content] h1') && document.querySelectorAll('[data-manual-content] p').length > 0`));
  await send('Emulation.setScriptExecutionDisabled', { value: false });
  console.log(`Browser regression: ${count} checks passed; zero skipped.`);
} finally {
  socket?.close();
  cli('close');
}
