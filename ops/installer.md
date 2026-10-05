# Vanity installer transport

Public command: `curl -fsSL https://voxlux.us/install.sh | sh`.

The Apache selector follows HF2Q's pattern: a temporary 302 redirect with
`Cache-Control: no-store, max-age=0`, pointing to one exact GitHub release asset.
There is intentionally no `public/install.sh` or `dist/install.sh` copy.
GitHub remains the source of truth for the source code, installer, release records,
and binaries. No release record or binary is hosted by this site.

## Reviewed installer

- Release: `v0.2.10`, checked 2026-10-04 using GitHub account `robertelee78`.
- Asset: https://github.com/robertelee78/vox/releases/download/v0.2.10/install.sh
- Size: 10,530 bytes.
- GitHub release-asset SHA-256:
  `aed781b8c04b03c26475e2143ccc0b49e8cef7acbec85c9bc6c1b211ebd641c2`.

The script version is pinned, **not the installed binary version**. The unchanged
upstream script resolves GitHub's latest stable per-platform release record, then
downloads that record's exact binary version. It checks size and SHA-256, and on
macOS requires the expected Developer ID and notarization. The website does not
override that upstream selection or change Vox's updater.

## Verification and updates

1. Review a published GitHub release and its original `install.sh` asset, using
   account `robertelee78`. Never regenerate or edit the installer here.
2. Update the version, asset digest, and size in `src/data/project.ts`, the exact
   redirect in `ops/apache/voxlux.us.conf`, and this record together. Review the
   guide against that release. Do not change the selector to a moving latest URL.
3. Run `npm run verify` and `npm run test:browser` against the built preview.
   The offline tests reject wrong hosts/versions, permanent or cacheable
   redirects, unavailable assets, and changed or truncated installer bytes.
4. Publish the tested static artifact and vhost using the approved SSH workflow,
   retain both previous versions, run `apache2ctl configtest`, then reload Apache.
5. Run `npm run verify:published`. It checks the live temporary redirect, exact
   GitHub Location, no-store policy, and downloaded asset size/SHA-256 as well as
   every website file. It downloads the script but never executes it.

An Astro-only local preview has no `/install.sh` endpoint: Apache owns that route.
These checks prove website transport, not installation on a clean macOS/Linux
machine or correctness of the Vox application.
