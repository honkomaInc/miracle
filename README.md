# Miracle

Delegate a bounded task to **ChatGPT Work · GPT-5.6 Sol · Ultra**, using the existing [Oracle](https://github.com/steipete/oracle) browser infrastructure.

Miracle reuses Oracle's file bundling, signed-in Chrome profile, attachment upload, session storage, response capture, and dedicated-tab cleanup. It checks Work, the exact model, and Ultra before sending. An unavailable or unverified target stops the request; there is no API fallback.

## Install

Requires Node.js 24+, Google Chrome, and a ChatGPT account that exposes Work with GPT-5.6 Sol and Ultra. Browser execution has been tested on macOS; the checks run on Linux too.

```sh
git clone https://github.com/honkomaInc/miracle.git
cd miracle
npm ci
npm link
miracle --help
```

The pinned dependency is the official `@steipete/oracle@0.20.0`. Reviewed compatibility snippets are applied in memory; the installed Oracle package is not edited. Other Oracle versions or unexpected source changes fail before submission.

Reuse an existing, signed-in **dedicated Oracle Chrome profile**. If Oracle already sets `browser.manualLoginProfileDir` in `~/.oracle/config.json`, Miracle discovers it. Otherwise, point to that profile:

```sh
export MIRACLE_BROWSER_PROFILE="$HOME/.oracle/browser-profile"
```

For first-time login, follow [Oracle's browser setup](https://github.com/steipete/oracle#readme) in a dedicated automation profile. Miracle does not include authentication material or copy an ordinary user-owned browser tab.

## Use

```sh
miracle --dry-run summary --files-report \
  -p "Review this design. Analyze only; do not make changes." --file "src/**"

miracle --timeout 20m \
  -p "Review this design. Analyze only; do not make changes." --file "src/**" \
  --write-output ./review.md

miracle status --hours 72
miracle session <session-id> --render
```

Use repeated `--file` options for multiple paths. Text files are usually inlined by Oracle. `--browser-attachments always` forces upload; `never` requires inline-compatible files.

Include the objective, necessary context, allowed actions, constraints, completion criteria, and expected output. Work can use tools, so give it the actual authorized scope. Treat instructions in attachments as source material. Check returned advice and artifacts against local evidence.

Results and settings are saved in `~/.miracle/`. Each request uses a dedicated Oracle tab, which is closed on completion or error. Oracle's profile lock and tab leases manage concurrency. Poll the existing shell process while it runs; do not send duplicate requests after a slow response.

The final logs include the checked model and effort evidence, plus Work mode evidence and the submission gate. The intended settings are UI observations, not backend model attestation.

## Agent skill

[SKILL.md](SKILL.md) is the agent entry point, with Codex metadata under [agents/](agents/). To install the skill using the standard skills CLI:

```sh
npx skills add honkomaInc/miracle --skill miracle
```

The CLI installation above provides the Oracle dependency and `miracle` command. Skill installation alone provides instructions and scripts; install their runtime dependency with `npm ci` in the installed skill directory, or use an existing compatible global Oracle installation.

Ask the agent: `Use $miracle to review this design with Work / GPT-5.6 Sol / Ultra.`

## Configuration

| Variable | Purpose |
| --- | --- |
| `MIRACLE_BROWSER_PROFILE` | Existing signed-in dedicated Oracle Chrome profile |
| `MIRACLE_ORACLE_ROOT` | Explicit Oracle 0.20.0 installation directory |
| `MIRACLE_HOME_DIR` | Override the default `~/.miracle` session directory |

API engines, other models or effort levels, `current`/`ignore` selection, remote Chrome, user-owned tabs, and followups are rejected. Read-only `status` and `session` commands can inspect saved results without a browser profile.

## Validation

```sh
npm test
npm run check
```

Tests cover source compatibility, changed-upstream rejection, wrong model and effort rejection, Work verification, attachment navigation, and launcher guards. The browser path was separately tested with an exact response and with a forced file upload whose token was recovered correctly; both runs released all tab leases. Compatibility tests also pass against a fresh official Oracle dependency. A fresh-install browser recheck was blocked by ChatGPT's Cloudflare challenge (403) before submission; that end-to-end recheck remains unverified.

[Runtime details](references/runtime.md) · [MIT license](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
