#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {installHooks, transform} from './hooks.mjs';
import {resolveOracleRoot, compatibility} from './runtime.mjs';

let root;
const args = process.argv.slice(2);
const valueOptions = new Set(['-p', '--prompt', '-f', '--file', '-s', '--slug', '--timeout', '--write-output', '--browser-input-timeout']);
const booleanOptions = new Set(['--files-report', '--verbose', '--render-markdown', '--write-artifacts', '--wait']);
const pinned = new Map([['--engine', 'browser'], ['-e', 'browser'], ['--model', 'gpt-5.6-sol'], ['-m', 'gpt-5.6-sol'], ['--browser-thinking-time', 'ultra'], ['--browser-model-strategy', 'select']]);
const forward = [];
try {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const equals = arg.indexOf('=');
    const key = equals < 0 ? arg : arg.slice(0, equals);
    if (pinned.has(key)) {
      const value = equals < 0 ? args[++i] : arg.slice(equals + 1);
      if (value !== pinned.get(key)) throw new Error(`${key} is fixed to ${pinned.get(key)} for Miracle.`);
    } else if (valueOptions.has(key)) {
      const value = equals < 0 ? args[++i] : arg.slice(equals + 1);
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}.`);
      forward.push(key === '--timeout' ? '--browser-timeout' : key, value);
    } else if (booleanOptions.has(arg)) forward.push(arg);
    else if (arg === '--browser-manual-login') { /* always enabled */ }
    else if (arg === '--browser-attachments') {
      const mode = args[++i];
      if (!['auto', 'never', 'always'].includes(mode)) throw new Error('Invalid attachment mode.');
      forward.push(arg, mode);
    } else if (arg === '--dry-run') {
      forward.push(arg);
      if (['summary', 'json', 'full'].includes(args[i + 1])) forward.push(args[++i]);
    } else if (arg === '--help' || arg === '-h') {
      console.log('miracle -p "<task>" [--file <path-or-glob>] [--dry-run summary] [--timeout 20m] [--write-output <path>]\nFixed: browser / Work / GPT-5.6 Sol / Ultra. Reuses Oracle bundling, Chrome profile, response capture and cleanup.\nmiracle status [--hours 72]; miracle session <id> [--render]');
      process.exit(0);
    } else if (i === 0 && ['status', 'session'].includes(arg)) {
      const rest = args.slice(1);
      const valid = arg === 'status' ? rest.length === 0 || rest.length === 2 && rest[0] === '--hours' && /^\d+$/.test(rest[1]) : /^[a-zA-Z0-9-]+$/.test(rest[0] || '') && rest.slice(1).every(v => ['--render', '--hide-prompt'].includes(v));
      if (!valid) throw new Error('Only read-only status/session inspection is supported.');
      forward.push(arg, ...rest);
      break;
    } else throw new Error(`Unsupported Miracle option: ${arg}. Target overrides, followups, remote/user tabs and API routes are blocked.`);
  }
  root = resolveOracleRoot();
  const oracleVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  if (oracleVersion !== '0.20.0') throw new Error(`Unsupported Oracle version: ${oracleVersion}; expected 0.20.0.`);
  for (const relative of [...Object.keys(compatibility), 'src/config.js', 'src/oracle/thinkingTime.js', 'src/browser/actions/navigation.js', 'src/browser/actions/modelSelection.js', 'src/browser/actions/thinkingTime.js', 'src/browser/actions/attachmentContext.js', 'src/browser/index.js']) {
    transform(relative, fs.readFileSync(path.join(root, 'dist', relative), 'utf8'));
  }
  const inspection = ['status', 'session'].includes(forward[0]);
  const miracleHome = process.env.MIRACLE_HOME_DIR || path.join(os.homedir(), '.miracle');
  let profile;
  if (!inspection) {
    const configPath = path.join(os.homedir(), '.oracle/config.json');
    const oracleConfig = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
    profile = process.env.MIRACLE_BROWSER_PROFILE || oracleConfig.browser?.manualLoginProfileDir;
    if (!profile || !fs.existsSync(profile) || !fs.statSync(profile).isDirectory()) throw new Error('An existing signed-in Oracle profile is required. Set MIRACLE_BROWSER_PROFILE or browser.manualLoginProfileDir in the Oracle config.');
    fs.mkdirSync(miracleHome, {recursive: true, mode: 0o700});
    fs.writeFileSync(path.join(miracleHome, 'config.json'), JSON.stringify({engine: 'browser', model: 'gpt-5.6-sol', browser: {chatgptUrl: 'https://chatgpt.com/', manualLogin: true, manualLoginProfileDir: profile, thinkingTime: 'ultra', modelStrategy: 'select', keepBrowser: false, attachRunning: false}}, null, 2) + '\n', {mode: 0o600});
  }
  process.env.ORACLE_ENGINE = 'browser';
  process.env.ORACLE_HOME_DIR = miracleHome;
  process.env.ORACLE_NO_DETACH = '1';
  // Preserve the parent environment while ensuring no worker loses the scoped hooks.
  process.argv = [process.execPath, path.join(root, 'dist/bin/oracle-cli.js'), ...forward];
  if (!inspection) process.argv.push('--engine', 'browser', '--model', 'gpt-5.6-sol', '--browser-thinking-time', 'ultra', '--browser-model-strategy', 'select', '--browser-manual-login', '--browser-manual-login-profile-dir', profile, '--chatgpt-url', 'https://chatgpt.com/', '--browser-archive', 'never', '--browser-research', 'off');
  installHooks(root);
  await import(pathToFileURL(path.join(root, 'dist/bin/oracle-cli.js')).href);
} catch (error) {
  console.error(`Miracle: ${error.message}`);
  process.exitCode = 64;
}
