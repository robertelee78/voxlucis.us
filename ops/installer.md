# Vanity installer transport

Public command: `curl -fsSL https://voxlucis.us/install.sh | sh`. The old address,
`https://voxlux.us/install.sh`, answers a permanent redirect to it, so it keeps working.

The Apache selector follows HF2Q's pattern: a temporary 302 redirect with
`Cache-Control: no-store, max-age=0`, here to GitHub's latest release's installer,
`https://github.com/robertelee78/vox/releases/latest/download/install.sh`. It names no version:
GitHub sends it on to the newest published release's `install.sh` asset, so a new release changes
what the command installs without any change on the server. There is intentionally no
`public/install.sh` or `dist/install.sh` copy. GitHub remains the source of truth for the source
code, installer, release records, and binaries. No release record or binary is hosted by this site.

The unchanged upstream script resolves GitHub's latest stable per-platform release record, then
downloads that record's exact binary version. It checks size and SHA-256, and on macOS requires
the expected Developer ID and notarization. The website does not override that upstream selection
or change Vox's updater.

## The release the site describes

`src/data/project.ts` names the release the site's words describe (`release`, now `v0.4.1`,
reviewed 2026-10-09). The pages show it from there: the home page's "new in", the install section,
the release links and the agents and security pages. Nothing in the installer path depends on it.

Per release, with no root step:

1. Review the release's notes, manual and `vox --help`, and its `install.sh` asset, using account
   `robertelee78`. Never regenerate or edit the installer here.
2. Change `release` and `reviewed` in `src/data/project.ts`, revise the pages, and record each
   claim's source in `docs/UX_SOURCE_MAP.md`.
3. Run `npm run verify` and `npm run test:browser` against the built preview.
4. Publish the tested `dist/` to `/opt/voxlucis.us/dist` over SSH as the site's own account, keeping
   the previous one. Apache's configuration is not touched.
5. Run `npm run verify:published`. It checks the live temporary redirect, its exact latest URL and
   no-store policy, that GitHub's latest resolves to the release the site describes, and that the
   downloaded `install.sh` matches the size and SHA-256 GitHub publishes for that release's asset,
   as well as every website file. It downloads the script but never executes it.

Between a new tag and step 5, the installer already gives the new release while the pages still
describe the previous one; `verify:published` fails until the site is published, which is the
reminder to do it.

An Astro-only local preview has no `/install.sh` endpoint: Apache owns that route.
These checks prove website transport, not installation on a clean macOS/Linux
machine or correctness of the Vox application.

## Checked 2026-10-09

`https://github.com/robertelee78/vox/releases/latest/download/install.sh` answered 302 to
`https://github.com/robertelee78/vox/releases/download/v0.4.1/install.sh`: 23,490 bytes, SHA-256
`a87ef19a69da2919611d76c4b2ac88365d9893fdd640ad926a89140d1ebab9e2`, the digest GitHub publishes
for v0.4.1's asset. From v0.4.1 the script installs `Vox.app` with `vox` inside it on Apple Silicon
Macs on macOS 13 or later, and refuses any other Mac before downloading; on x86_64 Linux it
installs `vox`. It also installs the agent skill pack for every harness present
(`VOX_NO_SKILL_INSTALL=1` skips it).

## The vhosts

`ops/apache/` holds the server's two vhosts, copied read-only from
`/etc/apache2/sites-available/` on 2026-10-08 (the server's SHA-256 before any change:
`voxlucis.us.conf` `36f72d9c…98ac5`, `voxlux.us.conf` `449b8846…b7ee6`):

- `voxlucis.us.conf`: the site, from `/opt/voxlucis.us/dist`, with the installer selector. The
  only difference from the server's copy is that selector: here GitHub's latest installer, on the
  server v0.4.0's until the one-time change to the latest selector is installed.
- `voxlux.us.conf`: the old domain, every path a 301 to the same path on `https://voxlucis.us`.
