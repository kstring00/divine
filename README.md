# DIVINE

**Current phase:** Stage 1 — Terrain Combat Prototype

> A survival-ARPG where you reshape the land itself with magic so that you can survive the night, while every scar you leave in the world attracts something that has adapted to it.

Stage 0 is locked. Stage 1 is an intentionally ugly grey-box prototype whose only job is to answer:

> **Is reshaping terrain during combat actually fun?**

## Controls

- `WASD` — move
- `LMB` — Chain Lightning
- `RMB` — Terrace (raise 3×3 terrain)
- `Q` — Hollow (dig 3×3 terrain)
- `1–6` — load scripted experiments E1–E6
- `N` — toggle enemy navigation paths
- `Alt + mouse wheel` — floor slice
- `R` — restart the current experiment
- `T` — download telemetry JSON

## Implemented in Stage 1

- Three.js 3/4 prototype renderer, fixed 45° yaw / ~52° pitch camera
- 64×64 terraced height grid, 1.5m tiles and 1.5m height steps
- Shared health/mana economy
- Chain Lightning, Terrace, Hollow
- Permanent fulgurite scars and +15% lightning damage on scarred ground
- Unstable terrain that decays after 45 seconds
- Husk melee AI with A* navigation, one-step clamber, windup attacks, terrain-triggered path invalidation
- Fixed 20Hz simulation with command-based input
- Terrain event queue and dirty-region rebuilds
- Rapier WASM physics bridge with terrain collider rebuilds
- 16×16 render/terrain chunk scaffold
- World-state serialization round trip
- Scenario loader, nav overlay, telemetry and performance HUD
- CI tests for the navigation hard guarantee

## Deliberately blocked

No inventory, gear, loot, XP, crafting, professions, survival meters, biomes, day/night, bosses, mythology content, procedural generation, farming, shelters, map screen, additional spells, character art, or multiplayer until the Stage 1 gate passes.

## Run

```bash
npm install
npm run dev
```

Verification:

```bash
npm run lint
npm test
npm run build
```

## Source of truth

- [`docs/STAGE_0_GAME_THESIS.md`](docs/STAGE_0_GAME_THESIS.md)
- [`docs/STAGE_1_CHARTER.md`](docs/STAGE_1_CHARTER.md)
- [`docs/STAGE_1_SPEC.md`](docs/STAGE_1_SPEC.md)
- [`docs/ARCHITECTURE_CONTRACT.md`](docs/ARCHITECTURE_CONTRACT.md)
