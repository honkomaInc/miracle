import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const packed = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}))[0];
for (const {path: name} of packed.files) {
  if (/(^|\/)(?:\.local|\.oracle|\.miracle|node_modules|\.env)(?:\/|$)/.test(name)) throw new Error(`Private file in package: ${name}`);
  const content = fs.readFileSync(path.join(root, name), 'utf8');
  if (/\/Users\/|\/var\/folders\/|gh[opusr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}/.test(content)) throw new Error(`Machine-specific path or credential pattern in ${name}`);
}
for (const name of ['SKILL.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'third-party/ORACLE-LICENSE', 'scripts/oracle-compatibility.json']) {
  if (!packed.files.some(f => f.path === name)) throw new Error(`Missing package file: ${name}`);
}
console.log(`MIRACLE_PACKAGE_OK: ${packed.files.length} portable, reviewed package files.`);
