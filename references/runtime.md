# Runtime

Miracle reuses Oracle **0.20.0** for input bundling, Chrome lifecycle and authentication, sessions, attachments, response capture, and cleanup. It does not modify the installed Oracle files.

Node 24 synchronous module hooks apply two layers in memory:

1. `scripts/oracle-compatibility.json` supplies reviewed ChatGPT DOM compatibility snippets for four upstream browser modules. SHA-256 checks accept only the official npm sources or the tested compatible sources. Unknown changes stop before submission.
2. `scripts/hooks.mjs` selects Work, verifies the checked GPT-5.6 Sol radio, adds Ultra to the six-level effort slider, maintains Work during uploads, and checks all three settings after attachment preparation and before submission.

The slider must announce Ultra (or ウルトラ) and report a matching numeric ARIA position. The maximum position alone is insufficient.

The launcher rejects API engines, target changes, unverified strategies, followups, arbitrary subcommands, remote browsers, and user-owned tabs. Workers cannot detach without the hooks. Project Oracle config files cannot override the target. The parent agent polls the same shell process for long runs.

Settings and sessions are isolated under `~/.miracle/` (or `MIRACLE_HOME_DIR`). Authentication reuses an existing signed-in Oracle profile, selected via `MIRACLE_BROWSER_PROFILE` or the existing Oracle config. No profile, cookies, tokens, sessions, or credentials are bundled with the package. Read-only status/session commands do not require a browser profile.

Oracle is discovered from the local npm dependency, then the global npm installation. `MIRACLE_ORACLE_ROOT` can explicitly select an installation. The version must be 0.20.0.

`npm test` checks compatibility, model/effort guards, mode verification, and attachment navigation without launching Chrome. Browser behavior was separately tested with Work / GPT-5.6 Sol / Ultra, including forced file upload, exact fixture-token recovery, and zero remaining tab leases. A fresh-install browser recheck was blocked by a ChatGPT Cloudflare 403 challenge before submission; that recheck remains unverified. Browser UI changes may require updated adapters.
