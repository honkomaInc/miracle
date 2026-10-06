import {registerHooks} from 'node:module';
import {fileURLToPath} from 'node:url';
import {workModeExpression} from './work-mode.mjs';
import {adaptOracleSource} from './runtime.mjs';

export function replaceChecked(source, before, after, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`Miracle Oracle compatibility check failed (expected ${expected}, found ${count}): ${before.slice(0, 90)}`);
  return source.split(before).join(after);
}

export function transform(relative, source) {
  source = adaptOracleSource(relative, source);
  if (relative === 'src/config.js') {
    source = replaceChecked(source, 'export async function loadUserConfig(options = {}) {', 'export async function loadUserConfig(options = {}) {\n    options = {...options, includeProject: false};');
  }
  if (relative === 'src/oracle/thinkingTime.js') {
    source = replaceChecked(source, '    "heavy",', '    "heavy",\n    "ultra",');
    source = replaceChecked(source, '        case "heavy":', '        case "ultra":\n            return "ultra";\n        case "heavy":');
  }
  if (relative === 'src/browser/actions/navigation.js') {
    const start = source.indexOf('export async function ensureChatMode(');
    const end = source.indexOf('export function buildChatModeProbeExpressionForTest()', start);
    if (start < 0 || end < 0) throw new Error('Miracle navigation adapter incompatible with Oracle.');
    source = `import {ensureWorkMode} from ${JSON.stringify(new URL('./work-mode.mjs', import.meta.url).href)};\n` + source.slice(0, start) + 'export const ensureChatMode = ensureWorkMode;\n' + source.slice(end);
  }
  if (relative === 'src/browser/actions/modelSelection.js') {
    const start = source.indexOf('export async function ensureModelSelection(');
    const end = source.indexOf('function assertResolvedModelSelection(', start);
    if (start < 0 || end < 0) throw new Error('Miracle model adapter incompatible with Oracle.');
    source = `import {ensureWorkModel} from ${JSON.stringify(new URL('./work-mode.mjs', import.meta.url).href)};\n` + source.slice(0, start) + 'export const ensureModelSelection = ensureWorkModel;\n' + source.slice(end);
  }
  if (relative === 'src/browser/actions/thinkingTime.js') {
    source = replaceChecked(source, 'export async function ensureThinkingTime(Runtime, level, logger, desiredModel) {\n    const result = await evaluateThinkingTimeSelection(Runtime, level, desiredModel);', `export async function ensureThinkingTime(Runtime, level, logger, desiredModel) {\n    const result = await evaluateThinkingTimeSelection(Runtime, level, desiredModel);\n    if (level === "ultra" && ["switched", "already-selected"].includes(result?.status) && !/^(Ultra|ウルトラ)$/i.test(result?.label?.trim() || "")) throw new Error("Miracle cannot verify the exact Ultra label; prompt remains unsent.");`);
    source = replaceChecked(source, 'const strictProEffort = level === "pro" ||', 'const strictProEffort = level === "ultra" || level === "pro" ||');
    source = replaceChecked(source, "      heavy: ['heavy', 'schwer', '重度', '加重'],", "      heavy: ['heavy', 'schwer', '重度', '加重'],\n      max: ['max', '最大'],\n      ultra: ['ultra', 'ウルトラ'],");
    source = replaceChecked(source, "['light', 'standard', 'extended', 'extra-high', 'pro']", "['light', 'standard', 'extended', 'extra-high', 'max', 'ultra']", 2);
    source = replaceChecked(source, "thumb.getAttribute('aria-valuemax') !== '4'", "thumb.getAttribute('aria-valuemax') !== '5'");
    source = replaceChecked(source, 'attempt < 4 && performance.now()', 'attempt < 6 && performance.now()');
    source = replaceChecked(source, '(TARGET_IS_ASTRA_LATEST && isVisible(modelBtn) ? modelBtn : null)', '((TARGET_IS_ASTRA_LATEST || TARGET_IS_GPT56_MODEL && TARGET_LEVEL === "ultra") && isVisible(modelBtn) ? modelBtn : null)');
    source = replaceChecked(source, 'level === "pro" ? "Pro" : "Pro Extended"', 'level === "ultra" ? "Ultra" : level === "pro" ? "Pro" : "Pro Extended"', 2);
    source = replaceChecked(source, 'return level === "pro" ? "Pro"', 'return level === "ultra" ? "Ultra" : level === "pro" ? "Pro"');
  }
  if (relative === 'src/browser/actions/attachmentContext.js') {
    const start = source.indexOf('export function buildComposerNavigationProbeExpression()');
    const end = source.indexOf('export function assertComposerNavigationSnapshot', start);
    if (start < 0 || end < 0) throw new Error('Miracle attachment adapter incompatible with Oracle.');
    const expr = `(() => { const mode = ${workModeExpression}; return {currentUrl: location.href, workSelected: mode.status === 'chat', modeUnverified: mode.status !== 'work'}; })()`;
    source = source.slice(0, start) + `export function buildComposerNavigationProbeExpression() { return ${JSON.stringify(expr)}; }\n` + source.slice(end);
    source = replaceChecked(source, 'value?.workSelected || workConversation || unexpectedNavigation', 'value?.workSelected || unexpectedNavigation');
  }
  if (relative === 'src/browser/index.js') {
    const boundary = source.indexOf('async function runRemoteBrowserMode(');
    if (boundary < 0) throw new Error('Miracle local browser boundary changed.');
    const remote = source.slice(boundary);
    source = source.slice(0, boundary);
    const submit = '            const deepResearchTargetBaseline = deepResearch && client';
    source = replaceChecked(source, submit, `            modelSelectionEvidence = await raceWithDisconnect(ensureModelSelection(Runtime, config.desiredModel, logger, "select"));\n            thinkingSelectionEvidence = await raceWithDisconnect(ensureThinkingTime(Runtime, "ultra", logger, config.desiredModel));\n            await raceWithDisconnect(ensureChatMode(Runtime, Input, config.inputTimeoutMs, logger));\n            logger("[browser] Miracle model selection submission gate: Work + GPT-5.6 Sol + Ultra verified; failClosed=yes");\n` + submit);
    source += remote;
  }
  return source;
}

export function installHooks(root) {
  registerHooks({load(url, context, nextLoad) {
    const loaded = nextLoad(url, context);
    if (url.startsWith('file:')) {
      const path = fileURLToPath(url);
      if (path.startsWith(root + '/dist/')) {
        const relative = path.slice((root + '/dist/').length);
        return {...loaded, source: transform(relative, String(loaded.source))};
      }
    }
    return loaded;
  }});
}
