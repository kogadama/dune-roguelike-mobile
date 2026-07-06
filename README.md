# Sietch Survivors

A Dune-inspired survivors-style roguelite for mobile, built as an installable
PWA. Retro pixel art (all generated in code — zero art assets), modern
mechanics, tuned for iPhone.

**Personal project — not for distribution or profit.**

## Play it on your iPhone

1. Merge this branch to `main` (the deploy workflow publishes to GitHub
   Pages), or deploy `dist/` anywhere that serves HTTPS.
   - **Note:** on a free GitHub plan, Pages requires the repository to be
     **public**. Also enable it once in *Settings → Pages → Source: GitHub
     Actions*.
2. On the phone, open the Pages URL in **Safari**:
   `https://<your-username>.github.io/dune-roguelike-mobile/`
3. Tap **Share → Add to Home Screen**. Launch from the icon — the game runs
   fullscreen, offline, with your save stored on-device.

### iPhone checklist (first run)

- Fullscreen with no Safari chrome; no rubber-band scrolling or pinch zoom
- Rotate the phone: landscape = overlay controls, portrait = Game Boy shell
  (or force one in Settings)
- Audio starts after your first tap (iOS requirement)
- Airplane mode → relaunch from the icon still works (offline cache)
- Backgrounding auto-pauses the run
- If the phone runs warm on long sessions, flip **FPS CAP: 30** or
  **BATTERY SAVER: ON** in settings

## Controls

- **Right thumb** — floating joystick (touch anywhere on the right half)
- **Left thumb** — ability buttons (2 per character; 3rd unlocks via the
  meta tree capstone)
- Weapons fire automatically; you steer, dodge, and time abilities
- Desktop testing: WASD/arrows to move, 1/2/3 for abilities, ESC to pause

## The game

- **4 characters**, each true to the books, leveling independently across
  runs: Paul (Prescience slow-mo, The Voice), Jessica (Voice stun,
  prana-bindu rush), Gurney (war songs, shield bash), Stilgar (sand
  camouflage, crysknife flurry — +25% crysknife damage innate)
- **2 maps**: Arrakeen Outskirts (15 min, Beast Rabban) and the Deep Desert
  (20 min, Shai-Hulud — unlocked by defeating Rabban)
- **10 weapons** incl. 4 evolutions. Max a weapon + carry its paired passive,
  then open an elite's chest: e.g. **Lasgun + Shield Belt → Holtzman
  Cataclysm** (the books' shield/lasgun catastrophe, weaponized)
- **Meta progression**: every run banks XP; each level grants a skill point
  for that character's permanent tree (HP/damage/speed/regen/armor/…,
  capped so runs never trivialize)
- Enemy scaling is piecewise-linear with soft caps — late-game pressure
  comes from spawn density, never HP sponges

## Development

```bash
npm install
npm run dev          # local dev server
npm run build        # typecheck + production build (PWA)
npm run test:smoke   # headless Playwright smoke suite + screenshots
npm run gen:icons    # regenerate PWA icons (only needed if the art changes)
```

Useful dev URL params: `?autostart=paul:arrakeen&timescale=8&seed=42`
(skip menus, accelerate the sim, reproducible RNG). Debug hooks live on
`window.__test` (grantXp, warpTo, slayAll, killPlayer, healFull).

## Architecture notes

- Phaser 3.90 + Vite + TypeScript strict; `vite-plugin-pwa` for offline
- All sprites generated at boot from string-grid pixel templates
  (`src/gfx/PixelDSL.ts`) packed into one runtime atlas; the font is a
  code-authored 3×5 retro bitmap font
- All audio synthesized at boot (`src/audio/synth.ts`) — SFX bank and four
  looping chiptune tracks, no audio files
- Horde perf: pooled everything, zero-alloc spatial hash
  (`src/systems/CollisionGrid.ts`), 250 enemy cap, budgeted particles with
  FPS-adaptive ambient culling
- Every tuning formula lives in `src/data/balance.ts`
