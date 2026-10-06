import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const require = createRequire(import.meta.url);
export const compatibility = JSON.parse(fs.readFileSync(new URL('./oracle-compatibility.json', import.meta.url), 'utf8'));
const sha256 = text => createHash('sha256').update(text).digest('hex');

export function resolveOracleRoot() {
  if (process.env.MIRACLE_ORACLE_ROOT) return fs.realpathSync(process.env.MIRACLE_ORACLE_ROOT);
  try { return path.dirname(require.resolve('@steipete/oracle/package.json')); } catch {}
  try {
    const globalModules = execFileSync('npm', ['root', '-g'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
    const root = path.join(globalModules, '@steipete/oracle');
    if (fs.existsSync(path.join(root, 'package.json'))) return fs.realpathSync(root);
  } catch {}
  throw new Error('Oracle 0.20.0 is missing. Run npm ci in the Miracle directory, or set MIRACLE_ORACLE_ROOT.');
}

export function adaptOracleSource(relative, source) {
  const patch = compatibility[relative];
  if (!patch) return source;
  const digest = sha256(source);
  if (digest === patch.compatibleSha256) return source;
  if (digest !== patch.baseSha256) throw new Error(`Unsupported Oracle source: ${relative}. Expected the official 0.20.0 release or the tested compatible source; prompt remains unsent.`);
  const lines = source.split(/(?<=\n)/u);
  for (const {startLine, endLine, before, after} of [...patch.replacements].reverse()) {
    if (lines.slice(startLine, endLine).join('') !== before) throw new Error(`Oracle compatibility patch does not match: ${relative}`);
    lines.splice(startLine, endLine - startLine, after);
  }
  source = lines.join('');
  if (sha256(source) !== patch.compatibleSha256) throw new Error(`Oracle compatibility checksum failed: ${relative}`);
  return source;
}
