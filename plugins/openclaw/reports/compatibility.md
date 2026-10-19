# OpenClaw compatibility: 0.3.20 candidate

Checked on 2026-10-19 against base `577e6a8`. **Real model-driven TUI capture, indexing and fresh-session recall have not passed validation.** The checks below are registration and synthetic runtime contracts, not complete E2E acceptance. No release or version change is included.

The package declares OpenClaw `>=2026.3.11`. It declares all three tools in `contracts.tools` and includes legacy CLI `commands` metadata. No `activation.onStartup` is required.

| Host | Verified contract | Limits |
| --- | --- | --- |
| 2026.3.11 | Actual host loader discovers three tools, three hooks and CLI; hook-generated named-store JSONL anchor is readable by the tool | Synthetic conversation and summary; no model E2E |
| 2026.3.22 | Actual host loader and the same legacy transcript contract | Synthetic conversation and summary; no model E2E |
| 2026.10.5 | Actual host loader discovers three tools, three hooks and CLI; public SQLite SDK and real visibility policy allow a fresh same-agent session to read a hook-generated historical reference without a memory audience | Synthetic SDK sessions and fixture summary/core responses; no model E2E |

Tools: `memory_search`, `memory_get`, `memory_transcript`. Hooks: `agent_end`, `before_prompt_build`, `session_start`. CLI: `memsearch`. These observations cover the named versions, not every intermediate host release.

## Capture and transcript storage

Capture uses the second hook argument for session provenance. Before the first await it fixes workspace, memory directory, agent, session key/ID and host-resolved store. Summary/config calls, collection selection, indexing and maintenance keep that capture's workspace even when hooks interleave. `session_start` binds config/index to its captured workspace and memory directory; search/get factories and prompt skill hints retain their own workspace across awaits. Native summaries use independent UUID session IDs and literal shell quoting for message/model arguments. Failed turns, missing agent identity, sandboxed/incognito contexts and restricted conversation audiences are skipped.

The optional public transcript SDK validates the exact agent/key/ID and supplies visible-branch messages. New `openclaw-session:` references carry a logical store selector; they do not guess a SQLite filename or grant permission. Old hosts lacking that SDK retain standard JSONL files within the current profile/agent store, with traversal and realpath boundary checks. Automatic capture omits an anchor when the standard file is absent; topic/custom transcript paths are not guessed. SDK failures do not silently fall back to JSONL. Modern hosts require the SDK reference because a legacy path does not establish exact target-key metadata.

## Explicit L3 authorization

`memory_transcript` resolves current configuration from the host tool context and derives the store through the host resolver. It requires the reference's store and agent to match that trusted scope. It fetches only the exact target entry with the public runtime session accessor, verifies its session ID, and rejects missing, changed, incognito or non-shared metadata. The SDK's identity result must preserve the exact historical key/ID. Available invocation/host guards and the tool abort signal are checked around asynchronous work; metadata and policy are rechecked before output.

The public `session-visibility` **row checker** applies ordinary configured history policy. Default `all` and `agent` allow same-agent historical sessions. `self` restricts access to the requester key. `tree` uses durable owner/parent/spawn fields, with the official main-session routing rule. URI-supplied ownership is ignored. The row checker does not consume scoped grants; grant-only access remains unsupported. No memory audience, receipt, provider registration, permission database, gateway client or full-store scan is added for explicit L3.

This adapter is deliberately narrower than the full `sessions_history` authorization chain. Role-controlled cross-session access, draft/non-shared sessions and unknown target metadata are rejected. Sandboxed/workspace-confined callers, recognized subagent/ACP requesters and global session scope are unsupported. The public plugin context does not expose the host's private auxiliary `sessionReadScopeKey` ceiling. Hosts must exclude this tool from any other auxiliary surface whose ceiling cannot be preserved; the public checker alone does not establish full authorization equivalence there. Archived/reset incarnations without a matching current target entry are also unavailable.

On legacy hosts, `self`/`tree` or role-controlled configurations reject cross-session JSONL paths whose target ownership cannot be confirmed. Explicit history permission does not establish automatic memory-audience permission. Existing `memory_search`, `memory_get` and automatic recall partitioning are outside this change.

Output contains user/assistant text from the last user turn, capped at 32,000 characters, excluding thinking blocks, tool messages and raw event envelopes. The SDK reads the whole visible transcript; memory use is proportional to transcript size. This projection does not reproduce `sessions_history` secondary text redaction or paging. A representative 10,000-message input exercises filtering and truncation.

## Reproduce targeted checks

From `plugins/openclaw`, using a supported Node version and the project's build dependency:

```bash
npm test
npm run build
npm pack --dry-run
# Optional: use an already installed OpenClaw 2026.10.5 package.
node scripts/session-sdk-contract.mjs /absolute/path/to/node_modules/openclaw
```

The SDK test creates isolated synthetic SQLite sessions, runs the actual public policy implementation and invokes the plugin's capture hook and transcript tool. It covers default all without audience, self/agent/tree, trusted ownership, missing/draft/incognito metadata, forged references, restricted caller scopes and expired/aborted invocations. It uses fixture summary/core responses and never invokes a model or sends a message. Local tests additionally cover concurrent captures, scope snapshots, large input, legacy path boundaries and executable shell-quoting sentinels. Build/package gates check the generated entrypoint and packed file contents.

The real TUI attempt failed before a successful assistant turn. Automatic capture, index creation, fresh-session `memory_search`/`memory_get`, and TUI `memory_transcript` remain unverified. Synthetic runtime success does not change that result.

The retained `plugin-inspector-report.json`, `plugin-inspector-report.md` and `plugin-inspector-issues.md` are explicitly historical **0.3.19 snapshots**.

## Official contracts

- [Hook context](https://github.com/openclaw/openclaw/blob/v2026.10.5/src/plugins/hook-agent-context.types.ts)
- [Tool context](https://github.com/openclaw/openclaw/blob/v2026.10.5/src/plugins/tool-types.ts)
- [Public transcript SDK](https://github.com/openclaw/openclaw/blob/v2026.10.5/src/plugin-sdk/session-transcript-runtime.ts)
- [Public visibility SDK](https://github.com/openclaw/openclaw/blob/v2026.10.5/src/plugin-sdk/session-visibility.ts)
- [History authorization chain](https://github.com/openclaw/openclaw/blob/v2026.10.5/src/agents/tools/sessions-history-tool.ts)
- [Gateway session sharing](https://github.com/openclaw/openclaw/blob/v2026.10.5/src/gateway/session-sharing-policy.ts)
