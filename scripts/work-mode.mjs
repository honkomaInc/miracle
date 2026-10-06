// UI evidence only. Never inspect cookies, authentication tokens, or app stores.
export function workModeProbe() {
  const visible = node => {
    if (node.closest('[data-message-author-role], [data-turn], [data-chatgpt-search-unit-key]')) return false;
    const r = node.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(node).visibility !== 'hidden';
  };
  const selected = node => ['aria-pressed', 'aria-checked', 'aria-selected'].some(a => node.getAttribute(a) === 'true') || ['on', 'active', 'checked'].includes(node.getAttribute('data-state'));
  const controls = [...document.querySelectorAll('button[aria-pressed], button[role="radio"], button[role="tab"]')].filter(visible);
  const chat = controls.find(n => n.textContent.trim().toLowerCase() === 'chat');
  const work = controls.find(n => n.textContent.trim().toLowerCase() === 'work');
  if (work && selected(work) && !(chat && selected(chat))) return {status: 'work'};
  if (chat && selected(chat) && work && !selected(work)) {
    const r = work.getBoundingClientRect();
    return {status: 'chat', point: {x: r.x + r.width / 2, y: r.y + r.height / 2}};
  }
  return {status: 'unverified'};
}

export const workModeExpression = `(${workModeProbe.toString()})()`;

export async function ensureWorkMode(Runtime, Input, timeoutMs, logger) {
  const deadline = Date.now() + Math.min(timeoutMs, 10000);
  let switched = false;
  do {
    const result = await Runtime.evaluate({expression: workModeExpression, returnByValue: true});
    const probe = result.result?.value;
    if (probe?.status === 'work') {
      logger('[browser] Model selection mode evidence: requestedMode=work; resolvedMode=Work; verified=yes; failClosed=yes');
      return switched ? 'switched' : 'work';
    }
    if (probe?.status === 'chat' && probe.point && !switched) {
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
        await Input.dispatchMouseEvent({type, ...probe.point, ...(type === 'mouseMoved' ? {} : {button: 'left', clickCount: 1})});
      }
      switched = true;
    }
    if (Date.now() >= deadline) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  } while (true);
  throw new Error('Miracle cannot verify Work mode; prompt remains unsent.');
}

export async function ensureWorkModel(Runtime, desiredModel, logger, strategy = 'select') {
  if (desiredModel !== 'GPT-5.6 Sol' || strategy !== 'select') throw new Error('Miracle requires explicit GPT-5.6 Sol selection.');
  let switched = false;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const response = await Runtime.evaluate({expression: `(() => {
      const visible = n => {const r=n.getBoundingClientRect();return r.width>0 && r.height>0 && getComputedStyle(n).visibility!=='hidden'};
      const button = document.querySelector('button[aria-label="Select ChatGPT model"][aria-haspopup="menu"]');
      const options = [...document.querySelectorAll('[role="menuitemradio"], [role="radio"]')].filter(visible);
      const model = options.find(n => n.textContent.trim() === 'GPT-5.6 Sol');
      if (model?.getAttribute('aria-checked') === 'true') {
        const label = model.textContent.trim();
        if (button?.getAttribute('aria-expanded') === 'true') button.click();
        return {status: 'verified', label};
      }
      if (model && model.getAttribute('aria-disabled') !== 'true' && !model.hasAttribute('data-disabled')) {model.click();return {status: 'clicked'};}
      if (button && button.getAttribute('aria-expanded') !== 'true') button.click();
      return {status: 'waiting'};
    })()`, returnByValue: true});
    const result = response.result?.value;
    if (result?.status === 'clicked') switched = true;
    if (result?.status === 'verified') {
      logger('Model picker: ' + result.label);
      return {requestedModel: desiredModel, resolvedLabel: result.label, strategy, status: switched ? 'switched' : 'already-selected', verified: true, source: 'chatgpt-model-picker', capturedAt: new Date().toISOString()};
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Miracle cannot verify the checked GPT-5.6 Sol model option; prompt remains unsent.');
}
