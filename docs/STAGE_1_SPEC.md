# STAGE_1_SPEC.md

### `kstring00/divine` — Core Loop Prototype

Version 1.0 · Source of truth for Stage 1 · Supersedes Stage 0 where numbers conflict

## 0. The question

> **Is reshaping terrain during combat actually fun?**

Everything in Stage 1 exists to answer that and nothing else.

## 1. Structural vs tuning

**Structural:** 1.5m height step, no unaided player climb of one full step, shared mana pool, 3×3 Terrace/Hollow shapes, and the navigation hard guarantee. Structural changes require review.

**Tuning:** speeds, damage, costs, cooldowns, HP, durations, camera distance. Tune freely during playtesting and log changes.

## 2. World & terrain

- Tile: 1.5m × 1.5m.
- Height step: 1.5m.
- Arena: 64×64 tiles (96m × 96m).
- Height levels: 0–6; spawn terrain level 2.
- Cube geometry only. No slopes or smoothing.
- Tile state: `stableHeight`, current `height`, unstable edits, `scarType`, `scarIntensity`.
- Player-shaped terrain is unstable for 45s; warning state begins with 10s remaining; it returns to its stable height when edits expire.
- No permanent shaping in Stage 1.

## 3. Camera

- ~52° pitch, fixed 45° yaw, perspective 35° FOV, ~32m distance.
- Auto pull-back +0.8m per player elevation level.
- Occluding terrain between camera and player becomes translucent/cut away.
- `Alt + Scroll` sets a floor slice.

## 4. Player

- WASD only.
- Move speed 5.5m/s; acceleration 40m/s²; deceleration 55m/s².
- Player cannot climb a 1.5m step. Elevation must be cast, not walked.
- HP 100; health regen 2/s after 6s without damage.
- Mana 100; regen 5/s after 1s cast delay.
- **Combat and terrain shaping use the same mana pool.**

## 5. Spells

### Chain Lightning — LMB

- 18 mana, 0.8s cooldown, 0.25s cast, 14m range.
- 32 primary damage; jumps for 22 then 16 within 6m.
- Struck tiles receive permanent `fulgurite` scars.
- Targets standing on fulgurite take +15% lightning damage.

### Terrace — RMB

- 30 mana, 2s cooldown, 0.4s cast, 8m range.
- Raises a 3×3 area by exactly one height level.
- Result is unstable.

### Hollow — Q

- 25 mana, 2s cooldown, 0.4s cast, 8m range.
- Lowers a 3×3 area by exactly one height level.
- Result is unstable.

## 6. Husk

- 90 HP, 4.2m/s, 2.2m attack range, 18 attack damage.
- 1.0s telegraphed windup; 0.6s recovery.
- 25m aggro; 45m leash.
- Can traverse exactly one height step via a 1.2s clamber. During clamber it cannot attack and takes +50% damage.
- Cannot traverse a 2+ level step.
- One level therefore creates delay; two levels create a wall.

## 7. Navigation hard guarantee

Grid A* is derived directly from the terrain heightmap. A flat move costs 1; a one-level clamber costs 4. Terrain edits mark affected tiles plus a one-tile border dirty. Active paths crossing dirty cells are invalidated immediately. Repath budget is 8 queries/tick; an enemy waiting for a new path holds position instead of following stale data.

> **An entity must never traverse an impassable height step. Not for one frame.**

CI verifies rerouting around two-level barriers, complete enclosure, one-level trenches, terrain moving underneath entities, decay, and a 20-edit performance case.

## 8. Experiments

- **E1 Baseline:** one Husk charges over flat ground.
- **E2 Corridor:** test a raised wall during a charge.
- **E3 Open choice:** shaping must beat pure kiting without being forced.
- **E4 Plateau:** test whether elevation becomes degenerate.
- **E5 Scarcity:** three staggered Husks, starting mana 40.
- **E6 Scar memory:** repeat combat on fulgurite-scared terrain.

Hotkeys `1`–`6` reset directly into each experiment.

## 9. Instrumentation and gate

Telemetry records spell counts, combat/out-of-combat terrain casts, terrain-edit-caused repaths, elevated time, deaths, restarts, scenario events, and E6 scar returns. `T` downloads session JSON.

Target gate:

- Terrain edits ≥30% of casts.
- Player-edit-caused repaths ≥1.0/fight.
- Chain Lightning <70% of casts.
- Voluntary restarts ≥2/session.
- If Lightning exceeds 80%, shaping is decorative and Stage 1 fails regardless of subjective fun.

## 10. Architecture contract

```
src/
  sim/        fixed tick, state, serialization; no Three.js
  terrain/    heightmap, tile state, terrain events, decay, scars
  entities/   registry and IDs
  systems/    movement, spells, AI, navigation, telemetry
  input/      raw input -> Commands only
  rendering/  Three.js camera, chunks, occlusion, targeting, VFX
  debug/      experiments and debug tools
tests/
```

Simulation is 20Hz fixed, rendering uncapped. All input becomes command objects. Terrain mutation passes through an event queue. Rapier steps at the simulation rate. State must serialize/deserialize cleanly. Terrain/rendering use 16×16 chunk boundaries.

`sim/`, `terrain/`, `entities/`, and `systems/` must never import from `rendering/`; ESLint enforces the boundary.

## 11. Explicitly not in Stage 1

No inventory, gear, gear score, loot, XP, levels, crafting, professions, survival meters, biomes, day/night, giants, bosses, myth content, procedural generation, adapted enemy families, farming, camping, shelters, map, permanent terrain, additional spells, click-to-move, co-op, finished art, or production menus.

## 12. Timebox

Two weeks of iteration after the first playable. Then evaluate the telemetry and player behavior and make a GO / NO-GO decision. Do not add downstream features to rescue a failing terrain-combat loop.
