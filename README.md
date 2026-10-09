# Vox Lucis website

Static Astro product and documentation site for [Vox](https://github.com/robertelee78/vox).
The visual direction is room-first: a warm-dark app study connects the timeline, keyring, and
shared services. Ice blue indicates focus/live state; words and neutral glyphs explain trust.
HF2Q is not the page-layout template.

## Canonical user manual

The user manual lives once in `robertelee78/vox` under `docs/manual/`. Website builds follow
Vox `main`, resolve one coherent revision, validate the Markdown, and render it at
`/docs/manual/` in the site's visual language. No browser fetch or duplicate prose is involved.
Use `VOX_MANUAL_REF` for a review branch or reproducible build. See [the publication contract](ops/manual.md)
for input limits, provenance, reader checks and the explicit SSH deployment boundary.

## Local development

Use Node 22.22.2 (`.nvmrc`), then:

```sh
npm ci
npm run dev
npm run verify
npm run preview
```

With the built preview running, `npm run test:browser` exercises the actual static pages in
an isolated Chromium session. It uses the installed `agent-browser` CLI (not a site dependency).
The default preview URL is `http://127.0.0.1:4322`; set `VOX_TEST_URL` to test another local preview.
Use `npm run preview -- --host 127.0.0.1 --port 4322` for that default.

`npm run verify` checks Astro/TypeScript, tests the installer redirect contract, builds the complete static output, and checks every
local page, asset link, and fragment target. No build-time network request is required after
dependencies are installed. Production contains no analytics, third-party fonts, or remote scripts.
Browser checks cover the study's keyboard flow, copy success/failure, 320–1440px layouts,
200% text, all five routes, agent setup expansion/copying, reduced motion, and no-JavaScript fallbacks.

## Content

- `/` — interactive room/keyring/services design study, what is new in v0.4.0, product model, installation.
- `/agents/` — agent conversation, delivery by client, Sessions and drive, claims/handoffs, `vox setup` and limits.
- `/docs/getting-started/` — installation, the Mac app, identity, rooms, node-wide trust, anchors, tunnels, agent rooms and Sessions.
- `/security/` — v0.4.0 keyring (read or read + drive, offers), services, infrastructure, and explicit threat-model limits.
- `/404.html` — missing-page fallback.

`src/data/project.ts` names the published release the site describes: `v0.4.0`, checked on
2026-10-08, with its milestone and tag as the source. The site claims only what that release does.
Getting started leads into the canonical manual, which describes v0.4.0.
See [the source map](docs/UX_SOURCE_MAP.md) for evidence and the research/implementation boundary.
The upstream README contains older consent/service instructions; use the release's CLI source
and ADR implementation notes when revising this site. Trust is identity-wide across shared rooms,
including room-bound service access. Do not reintroduce `:grant` as a current command.

The public command is `curl -fsSL https://voxlux.us/install.sh | sh`. As on HF2Q, Apache
temporarily redirects this vanity URL to the exact versioned GitHub installer asset with
`Cache-Control: no-store, max-age=0`. Neither `public/` nor `dist/` contains an installer copy.
The script is release-pinned, but the upstream script selects the binary from GitHub's latest
stable release record. GitHub owns the source, installer, release records, and binaries; this
website does not mirror, modify, or independently select them. See
[installer transport](ops/installer.md) for the current digest and update procedure.

## Hosting

The existing Apache document root is **`voxlux.us:/opt/voxlux.us/dist`**, accessed with SSH/SCP.
Publish only the verified static artifact, preserving the previous document root for rollback.
The redesigned site was published and byte-verified on 2026-10-04. See the
[deployment record](ops/deployments/2026-10-04.md) for artifact hashes, checks, and backup locations.
`npm run verify:published` compares the current local build with the public HTTPS responses,
checks the installer redirect and cache policy, and hashes the downloaded GitHub installer
against its recorded release-asset digest. It never executes the installer.

Only the contents of the local `dist/` belong in that document root. Never copy the repository,
agent state, credentials, or `node_modules` into it. Publishing is a separate, explicit action.
Before publication, retain the previous remote artifact for rollback, upload the verified build,
and verify the served pages and asset bytes. The deployed vhost sets
`ErrorDocument 404 /404.html`; a missing route retains its HTTP 404 status.

The site needs no backend process, account service, database, or special rewrite rules.
