# Architecture Contract

Status: **Stage 0 locked**

These are not implementation preferences. They are constraints that protect persistence, browser performance, a later native port, and the option of co-op.

## 1. Simulation and rendering are separate

Game state lives in plain simulation data structures that know nothing about three.js. Rendering reads simulation state; it does not own it.

This includes:

- terrain grid / height state
- terrain scars
- entities
- inventory and progression data
- world events
- save data

## 2. Browser-first stack

- **Renderer:** three.js
- **Physics:** Rapier, opt-in rather than universal
- **Game layer:** custom entity registry / simulation layer
- **Loop:** fixed simulation tick + interpolated rendering
- **Persistence:** serialization from Stage 1 onward
- **World:** chunked load / unload / teardown

Do not write a general-purpose engine from scratch.

## 3. Commands, not direct input mutation

Input produces commands such as:

- `MoveTo`
- `CastSpell`
- `PlaceBlock`
- terrain-shaping commands

The simulation consumes commands. Input handlers do not directly mutate authoritative state.

## 4. Terrain edits are events

Terrain changes enter an event queue rather than directly rewriting the world from rendering/input code.

This protects:

- deterministic simulation
- later replay / undo tools
- save serialization
- potential network replication later

## 5. Entity identity

There is no global singleton called `player` as the basis of world state. Entities have IDs. The local player is the entity currently followed by the camera/input layer.

## 6. Performance budgets are features

Stage 1 must establish measurable budgets, including:

- enemy cap: begin around **30 simultaneous enemies**
- physics cap: approximately **50 active rigid bodies**
- hard build-volume limit
- chunk streaming boundaries
- aggressive geometry/resource teardown
- instancing for repeated terrain/foliage where appropriate

Long-session memory behavior matters. A scripted 60-minute run is eventually a more meaningful test than a short editor session.

## 7. Lighting philosophy

The art direction depends on darkness and emissive magic, but the browser cannot afford unlimited dynamic lights.

Use:

- primarily cheap/unlit or flat-shaded materials
- emissive materials and bloom for most magical brightness
- only a small number of real point lights at one time (roughly 2–4)

## 8. 3/4 terrain rules

- Terraced height grid; fixed height steps.
- Favor outward/downward growth over towers.
- Approximate maximum silhouette of ~4 vertical tiers.
- Camera target around 50–55° tilt.
- Occlusion dissolve is required.
- Floor slicing is required for construction/underground readability.
- Overhangs require structural support.

## 9. World persistence rule

The world is finite and densifying. Persistence stores meaningful changes/scars in a bounded world rather than encouraging infinite empty expansion.

## 10. Stage 1 non-negotiable technical proof

Enemy navigation must invalidate/rebuild when terrain changes.

If an enemy can ignore a raised wall or a trench, terraforming has no tactical meaning and the core thesis has not been tested.
