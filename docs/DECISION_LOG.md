# Stage 0 Decision Log

Status: **LOCKED**

This file is a concise operational index of decisions already locked in the Stage 0 master document. If this summary and the master document ever conflict, `STAGE_0_GAME_THESIS.md` wins.

## Product

- **Genre:** Survival / building / action-RPG hybrid.
- **Perspective:** 3/4 isometric-ish, tilted top-down.
- **Movement:** WASD primary; click-to-move secondary and disabled in build mode.
- **Launch class:** Wizard only.
- **Combat:** Spell-based, Diablo-lineage feel.
- **Progression:** Levels → spell unlocks, gear, gear score.
- **Loot:** Rare and hard-won; crafting + professions are the primary power path.
- **Currency:** Bronze / Silver / Gold.
- **Inventory:** Bag on `B`, grid-based.
- **Map:** `M`.
- **Launch biomes:** Starter zone, Winter, Jungle.
- **Enemies:** Smart melee AI; disarmable where applicable.
- **Building:** Shelter, tent, camp, terrain modification.
- **Theme:** Biblical war-mythology — Goliath, Nephilim, Samson, David.
- **Art:** Dark, low-poly, desaturated world with emissive magic.

## Platform and architecture

- Browser-first using **three.js**.
- **Rapier** for opt-in physics.
- Custom simulation/engine layer above rendering.
- Simulation and rendering stay separate.
- Fixed authoritative simulation tick; render interpolation.
- Entity IDs instead of a global `player` singleton.
- Input is command-based (`CastSpell`, `PlaceBlock`, `MoveTo`).
- Terrain changes are events on a queue.
- Serialization exists from the beginning.
- Chunk streaming and teardown discipline are Stage 1 concerns.
- Native engine re-gate at Stage 8; Godot remains an escape hatch, not the current plan.

## World

- One persistent, save-on-the-fly world.
- Finite and densifying rather than infinite.
- Long-term content generation happens *inside* the bounded world in response to scars, power, and elapsed time.
- Night is the primary pressure valve.
- Sessions target roughly 30–90 minutes with natural stopping points.

## Death

- Bag contents drop.
- Equipped gear stays on the player.
- One persistent death cache at a time.
- Respawn at last shelter/campfire.

## Survival

- **Temperature:** two-ended pressure (cold ↔ heat).
- **Water:** must be purified.
- **Food:** must be cooked/preserved.
- These systems move slowly and shape expedition preparation rather than becoming constant chores.
- Campfire is a convergent hub: cooking, purification, warmth, respawn, light.

## Signature mechanic

**The Scar System:** every spell permanently marks terrain, and enemy ecology adapts to the scars the player creates.

## Physics budget

- Physics is opt-in.
- Approximate hard cap: ~50 active bodies.
- Spend physics budget on consequence: collapse, slumping, ice failure, death ragdolls, rolling mass.
- If physics does not change a player decision, cut it.
