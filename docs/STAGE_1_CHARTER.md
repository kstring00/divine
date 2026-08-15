## 19. STAGE 1 CHARTER — CORE LOOP PROTOTYPE

*Repo is now authorized. Ugly graphics are not just acceptable, they are required — no art work happens in this stage.*

### Goal

Answer exactly one question:

> **Is reshaping the ground during a fight fun?**

Not "is the combat fun." Not "is the building fun." The *intersection*. If the intersection isn't fun, this is a different game and we need to know inside a month.

### Deliverables

- One \~120×120 tile arena. Flat-shaded grey boxes. Terraced height grid, fixed 2m steps.
- Camera at \~52° tilt, with occlusion dissolve and floor-slice already working. **These are Stage 1 features, not polish** — without them we can't even evaluate the thing we're testing.
- WASD movement, free cursor targeting.
- **Three spells only:** *Chain Lightning* (damage), *Terrace* (raise), *Hollow* (dig).
- Shared mana pool for combat and shaping. This is the core tension; it must exist on day one.
- Unstable terrain that decays back after a set duration.
- One melee enemy type. Basic pathing.
- Visible, persistent scars where lightning strikes. Visual only — no adapted spawns yet.
- Health, mana, fail state, restart.
- **Architecture:** fixed tick loop, entity registry, command-based input, chunk teardown scaffold, serialization stub.

### The one technical thing that decides this stage

**Enemy navigation must invalidate and rebuild when terrain changes.**

If an enemy walks through a wall you just raised, or fails to route around a trench you just dug, then terraforming has no tactical meaning and the entire thesis is untested. Every other item on this list can be ugly and approximate. This one has to actually work.

### What we deliberately DON'T build

No survival meters. No inventory or bag. No gear, gear score, or loot. No XP or levels. No crafting or professions. No biomes. No day/night. No giants, bosses, or myth content. No procedural generation. No adapted enemy types. No farming, camping, or shelters. No map. No audio beyond placeholder hit sounds. No co-op scaffolding beyond the command pattern. No art of any kind.

Every one of those is in this document and every one of them is Stage 3 or later.

### Exit criteria

1. We voluntarily want to play it again.
2. **We catch ourselves raising or digging terrain for tactical reasons mid-fight**, not just casting damage and occasionally remembering we can shape the ground.

Criterion 2 is the real gate. Criterion 1 without criterion 2 means we built a mediocre ARPG.

### Kill criteria

If after roughly two weeks of iteration terraforming still feels like a chore interrupting combat, we **stop and revisit §12.** We do not add crafting, loot, or biomes hoping they'll make it fun. That is precisely the failure mode this whole process exists to prevent.
