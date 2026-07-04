/**
 * Best-effort haptics. Android: navigator.vibrate. iOS Safari has no vibrate
 * API; iOS 18+ fires a light tick when a <input type=checkbox switch> is
 * toggled via a <label> click. Rare events only — never gameplay-critical.
 */

let iosSwitchLabel: HTMLLabelElement | null = null;
let enabled = true;

export function setHapticsEnabled(v: boolean): void {
  enabled = v;
}

function ensureIosSwitch(): HTMLLabelElement {
  if (!iosSwitchLabel) {
    const label = document.createElement('label');
    label.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-99px';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitchLabel = label;
  }
  return iosSwitchLabel;
}

export function haptic(pattern: 'light' | 'medium' | 'heavy' = 'light'): void {
  if (!enabled) return;
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      const ms = pattern === 'light' ? 10 : pattern === 'medium' ? 25 : 50;
      if (navigator.vibrate(ms)) return;
    }
    ensureIosSwitch().click();
  } catch {
    // Haptics are decorative — never let them throw into game code.
  }
}
