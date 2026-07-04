/**
 * Shared control state: written by HudScene's touch handlers (and keyboard
 * fallback), read by GameScene systems. Movement on the RIGHT thumb,
 * abilities on the LEFT — per the player's spec.
 */

export interface ControlsState {
  /** Normalized movement vector, magnitude 0..1. */
  moveX: number;
  moveY: number;
  /** Ability button press edges (consumed by AbilitySystem). */
  abilityPressed: [boolean, boolean, boolean];
  /** Joystick visual state for the HUD. */
  stick: { active: boolean; originX: number; originY: number; dx: number; dy: number };
}

export const controls: ControlsState = {
  moveX: 0,
  moveY: 0,
  abilityPressed: [false, false, false],
  stick: { active: false, originX: 0, originY: 0, dx: 0, dy: 0 },
};

export function consumeAbilityPress(i: 0 | 1 | 2): boolean {
  if (controls.abilityPressed[i]) {
    controls.abilityPressed[i] = false;
    return true;
  }
  return false;
}
