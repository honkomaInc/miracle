import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ensureWorkMode} from './work-mode.mjs';
import {installHooks, transform, replaceChecked} from './hooks.mjs';
import {resolveOracleRoot, adaptOracleSource, compatibility} from './runtime.mjs';

const root = resolveOracleRoot();
for (const relative of [...Object.keys(compatibility), 'src/config.js', 'src/oracle/thinkingTime.js', 'src/browser/actions/navigation.js', 'src/browser/actions/modelSelection.js', 'src/browser/actions/thinkingTime.js', 'src/browser/actions/attachmentContext.js', 'src/browser/index.js']) {
  transform(relative, fs.readFileSync(`${root}/dist/${relative}`, 'utf8'));
}
for (const relative of Object.keys(compatibility)) {
  const source = fs.readFileSync(`${root}/dist/${relative}`, 'utf8');
  const adapted = adaptOracleSource(relative, source);
  assert.equal(adaptOracleSource(relative, adapted), adapted, 'compatibility is idempotent');
  assert.throws(() => adaptOracleSource(relative, source + '\n// unexpected upstream change'), /Unsupported Oracle source/);
}
assert.throws(() => replaceChecked('changed upstream', 'required marker', 'patch'), /compatibility check/);
installHooks(root);
const model = await import(pathToFileURL(`${root}/dist/src/browser/actions/modelSelection.js`));
model.assertResolvedModelSelectionForTest('GPT-5.6 Sol', 'GPT-5.6 Sol');
for (const wrong of ['GPT-6 Astra', 'GPT-6.1 Sol', 'GPT-5.6 Terra', 'GPT-5.6 Sol Pro', 'Default']) {
  assert.throws(() => model.assertResolvedModelSelectionForTest('GPT-5.6 Sol', wrong));
}
const thinking = await import(pathToFileURL(`${root}/dist/src/browser/actions/thinkingTime.js`));
const logger = () => {};
for (const status of ['already-selected', 'switched']) {
  const Runtime = {evaluate: async () => ({result: {value: {status, label: 'Ultra'}}})};
  const evidence = await thinking.ensureThinkingTime(Runtime, 'ultra', logger, 'GPT-5.6 Sol');
  assert.equal(evidence.verified, true);
  assert.equal(evidence.strictFailClosed, true);
}
await assert.rejects(thinking.ensureThinkingTime({evaluate: async () => ({result: {value: {status: 'already-selected', label: 'High'}}})}, 'ultra', logger, 'GPT-5.6 Sol'), /exact Ultra label/);
for (const status of ['chip-not-found', 'selection-unverified', 'option-disabled', 'option-not-found']) {
  const Runtime = {evaluate: async () => ({result: {value: {status}}})};
  await assert.rejects(thinking.ensureThinkingTime(Runtime, 'ultra', logger, 'GPT-5.6 Sol'));
}
await assert.rejects(ensureWorkMode({evaluate: async () => ({result: {value: {status: 'unverified'}}})}, {}, 0, logger), /prompt remains unsent/);
let clicked = 0;
const Runtime = {evaluate: async () => ({result: {value: clicked ? {status: 'work'} : {status: 'chat', point: {x: 10, y: 10}}}})};
assert.equal(await ensureWorkMode(Runtime, {dispatchMouseEvent: async () => clicked++}, 1000, logger), 'switched');
const attachment = await import(pathToFileURL(`${root}/dist/src/browser/actions/attachmentContext.js`));
attachment.assertComposerNavigationSnapshot('https://chatgpt.com/', {currentUrl: 'https://chatgpt.com/', workSelected: false, modeUnverified: false});
assert.throws(() => attachment.assertComposerNavigationSnapshot('https://chatgpt.com/', {currentUrl: 'https://chatgpt.com/', workSelected: true, modeUnverified: false}));
assert.throws(() => attachment.assertComposerNavigationSnapshot('https://chatgpt.com/', {currentUrl: 'https://chatgpt.com/c/different-thread', workSelected: false, modeUnverified: false}));
const launcher = fileURLToPath(new URL('./miracle.mjs', import.meta.url));
for (const args of [['--engine', 'api'], ['--engine=api'], ['-eapi'], ['--model', 'gpt-6-pro'], ['--browser-thinking-time', 'high'], ['--browser-model-strategy', 'current'], ['--followup', 'old'], ['--remote-chrome', 'localhost:9222'], ['--browser-tab', 'user'], ['--route'], ['--browser-keep-browser']]) {
  const result = spawnSync(process.execPath, [launcher, ...args], {encoding: 'utf8'});
  assert.equal(result.status, 64, `guard: ${args}`);
}
console.log('MIRACLE_TESTS_OK: compatibility, wrong-model rejection, Ultra fail-closed, Work verification, attachment navigation, launcher guards');
