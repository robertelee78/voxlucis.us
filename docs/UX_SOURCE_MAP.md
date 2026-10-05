# Website source and design boundaries

Reviewed 2026-10-04. Product direction: Vox release milestone 2 (v0.3.0).
Implementation reference: `rearch/v030` at `2d8385d4f90891c96843f32d6d002bc1b69aac1e`.
GitHub reads for Vox must authenticate as `robertelee78`, scoped to the command rather than switching the global account.

The product-design study does not decide the twenty questions left open by the supplied UX
research. The later canonical-manual work is separately governed by Vox ADR-027 and this
repository's ADR-001, as described below.

## Evidence hierarchy

1. The user's direction and accepted decisions in milestone 2.
2. The milestone's integration source, including behavior and tests—not stale comments alone.
3. The supplied UX research as interaction and visual guidance, not implementation proof.
4. The published v0.2.10 release, specifically for installer and versioned getting-started commands.

## Model mapped to the site

| Website element | Source |
| --- | --- |
| Node is an identity; concurrent nodes use one daemon; acting identity is explicit | #397, #403, #406, #409; ADR-026 |
| Local aliases instead of sender-chosen identity labels | #18; `vox-tui/src/ident.rs`, `live.rs` |
| Keyring trust is directional and spans shared rooms | ADR-020 §3; `vox-core/src/node/trust.rs` |
| Named services use `service.node.room.vox`, with the viewer's aliases | #339; ADR-017 decision 12 |
| Removing trust or a service cuts live sessions | #68; ADR-017 |
| Files are offered through a room-bound pull service | #171; ADR-020 §11 |
| Explicit history-grant choice, forward-only by default | #63 |
| Missing bodies are not a generic “untrusted message” state | `live.rs::project_timeline`, `channel.rs::shown_timeline`, `api.rs::MessageRow::owed` |
| Connection count does not prove delivery, catch-up, or reading | `viewmodel.rs::SyncStatus` |

The integration timeline projects actual rendered text or `(not received yet)` for an owed body.
The earlier `Option<String>` comment and the older research branch were insufficient grounds to
claim that all unreadable messages appear as locked markers. The website therefore invents no
untrusted plaintext or blanket trust-derived placeholder. Its unknown node appears only in the member list.

## Visual and interaction direction

Warm near-black/off-white surfaces; restrained ice for focus and live-state examples; neutral trust
glyphs with words; amber for the unknown-node action cue. A faceted V. No network wallpaper,
green terminal branding, padlock ornament, fake hex, or decorative telemetry.

The main experience is a keyboard-accessible room/keyring/services study, not a functioning app.
All its states are labeled illustrative. The file offer is not fetched. Copying the example SSH
command does not configure a proxy or test connectivity. No trust action, real file transfer,
message send, clipboard read, read receipt, or network call is simulated as successful.

No automatic file retrieval, daemon-held attachment lifetime, inline thumbnail transport, verified
badge, identity sync, agent-type flag, or native-app availability is decided by this website.
The website's ice accent is not an amendment to Vox's accepted ADRs.

## Acceptance

- Astro/TypeScript and the static build pass.
- All local links/assets/fragments resolve; five pages have one main heading each.
- Tabs work with pointer, arrows, Home/End, and focus transfer from room actions.
- Copy succeeds or explicitly offers text selection when the clipboard is denied.
- Layout works down to 320px and with 200% text; reduced motion and no-JavaScript remain usable.
- Published file bytes match the tested artifact; the previous document root is retained for rollback.

## Agent comms expansion — 2026-10-04

The homepage now introduces agent comms and `/agents/` explains delivery, ownership,
setup and file transfer. GitHub's `rearch/v030` head was rechecked as the same pinned
source above; latest published release remains `v0.2.10`. No Vox source or live
profiles were modified or run.

| Website claim | Reviewed implementation |
| --- | --- |
| Discussion/ownership in Vox; progress/proof on GitHub through awa | Bundled `assets/agent-skill.md`; ADR-020 context/§5; ADR-021 §1 |
| Hooks deliver; skill explains conventions; per-session cursors, bounded attributed context | `agent_hook.rs::run`, `drain`; `cli.rs::AgentCmd` |
| Claude Code/OpenCode support wakes; Codex waits for next turn | `wake.rs`, explicit Codex refusal; ADR-020 §6 |
| Addressing selects action, not a private audience | `vox-agentcomms/src/envelope.rs`; ADR-020 §4.6–4.7; room read/keyring model |
| Agent hooks bind to their own node, never the operator's implicitly | `cli.rs::AgentPluginArgs`, `AgentHookArgs`; `agent_hook.rs::Daemon::register` |
| Attachment needs an already attached node or a valid passphrase | `agent_hook.rs::Daemon::register`, including refusal and bounded timeout |
| Claims are session ownership, not locks; exit 5 is uncertain; version mismatch refuses | `cli.rs::RoomCmd::Claim`; `coord.rs`; bundled skill |
| Handoff needs a recipient claim; release does not mean complete | ADR-021 §4; bundled skill and CLI |
| Files are live services, hash checked, no overwrite | `room_cli.rs::send_file`, `get_file`; bundled skill |

ADR-020 and ADR-021 are Accepted, dated 2026-09-21 and 2026-09-23 respectively.
Their status text includes planned items and proof gaps; some notes lag the source.
We do not turn blanket ADR status into a shipping claim. Named-node commands on
`/agents/` are explicitly v0.3.0 integration examples. The v0.2.10 getting-started
page retains the older profile-based boundary. The conversation is illustrative,
uses `robertGPT`, and does not simulate an actual claim, agent run or result.
Encryption is not described as isolating content from the connected model/provider.
No live-model or two-machine test is claimed by website verification.

## Canonical manual — published 2026-10-05 UTC

The fixed implementation reference above applies to the design study and agent overview;
it is **not** the manual's content selector. `/docs/manual/` is rendered from canonical
`vox/docs/manual` files on current Vox `main`, resolved once per build. There are no copied
chapters or maintained manual SHA in this repository. The earlier five-page acceptance and
getting-started descriptions above record the preceding website iteration.

The manual publication adds 13 chapters (18 HTML pages total), labels released v0.2.10 and
development instructions separately, and preserves getting-started bookmarks as a task map.
This work did add documentation and an ADR to Vox, plus its README vanity-installer link;
it made no Vox runtime change. See [manual operations](../ops/manual.md) and the
[exact deployment receipt](../ops/deployments/2026-10-05-manual.md) for source ownership,
scoped real-binary evidence, browser acceptance and public-byte verification.
