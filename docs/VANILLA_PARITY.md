# Torchflower vanilla parity

Target Bedrock 1.26.52 / Script API 2.8.0. History: see git (inspection narratives, deploy logs, seed-override probe).

## Design
- Vanilla `minecraft:torchflower` is hardcoded and cannot emit light, so the mature placed flower is swapped for
  `torchlight:torchflower` (light 14). Item, loot (one vanilla torchflower), dye, stew, compost and bee-feed routes stay vanilla by identity.
- The growing `minecraft:torchflower_crop` stays fully native (growth, bone meal, trampling). Mature vanilla flowers do not
  reproduce with bone meal, so no handler is added (see VERIFIER_WARNINGS.md).
- Player-planted crops are tracked by position (persisted) and re-checked every 20 ticks (1 s; 100 until 2026-11-17, owner saw a several-second delay in game; the 1 s value is not re-tested yet) only while the list is non-empty. Since 2026-11-21 each check reads at most 32 crops in rotation (owner decision, tablet budget): on a farm of <= 32 crops a grown crop still glows within ~1 s, on a bigger farm it may take N/32 seconds (e.g. 200 crops: up to ~7 s).
  No world scanning. Setup sweep (once per world) and `/scriptevent torchlight:sweep` also enroll growing crops they find; one save at the end of the job.
- Soils: eleven soils in both the block `placement_filter` and `support.js` SOILS (includes mycelium, muddy mangrove roots;
  pale moss block added 2026-11-21 after the owner saw it hold vanilla flowers).
- Fire: catch 30 / destroy 100 (Bedrock one-block-flower row). Water pops it (WATER.md). Pistons and soil motion: SUPPORT_AND_PISTONS.md.

## Owner decisions
- 2026-10-21: restore the two missing soils, correct fire values, enroll sweep-found crops.
- 2026-10-23: farmer-planted torchflowers stay unlit until a sweep runs nearby (README line); no new code.
- 2026-10-23: rejected, a persistent farmland watcher (point checks on every farm to catch a rare cosmetic case; contradicts the no-polling goal).
- 2026-10-23: rejected, the `minecraft:torchflower_seeds` legacy override and a player-only custom crop swap (global override, new crop content, loses exact vanilla growth). Probe pack removed.
- 2026-11-21: pale moss block is a soil. The crop checker budget and the sweep job slicing ship without a game check.
  Unlit farmer-planted and far-away flowers are revisited after the first release (TODO: an item that lights them).
- 2026-11-22: glowing torchflowers use vanilla flower offsets (owner): `minecraft:random_offset` x/z range -4..4, steps 16, no y, so the swapped flower sits in a random corner like a vanilla one. Not yet verified in game: does the offset equal vanilla's per-position hash (no jump on placement/maturing)? Check: place a poppy, note the spot, break it, place a torchflower there. Owner game check 2026-11-22: placement still jumps (corner to corner), so the component's offset is not vanilla's hash; maturing looks better. Selection box stays 12x14x12 (owner: same size as before; a shrink to 8x14x8 in 3591229 was reverted).

## Known limits
- Farmers can plant torchflower seeds only if a player gives or drops them; the mature flower then stays unlit until a sweep. Stable 2.8 has no crop-growth or villager-planting event.
- Crops in chunks that never reload stay in the tracked list; the checker skips them with `isChunkLoaded` (no block read) and drops an entry only when its chunk is loaded and the block is no longer a growing crop.
- Bees: the custom placed block is not recognised for nectar or tree nests (bee override deferred). Normal potting uses the vanilla item and leaves a native, unlit pot.

## In-game results (owner, Bedrock 1.26.63, 2026-11-21)
- Pistons, including rapid pushes: correct (one pop, one drop).
- Lava burns the glowing flower.
- Flint and steel on the flower: the flower disappears and a short-lived flame appears in the next block, the same as
  vanilla flowers.
- Pale moss block holds vanilla flowers, so it is now a torchflower soil (placement in game not re-checked after the change).
- Earlier passes: crop to flower after reload, bone meal on a mature flower, water pop, pick-block
  (`TEST_FEEDBACK_2026-10-25.md`).

## Bedrock 26.60 impact (2026-10-27, documented only)

Source review against the 26.60 changelog and API 2.11.0 / 2.12.0-beta declarations; nothing tested in game.

- Verdict: no change required. MCPE-240755 (`onBreak` now fires when a custom block with a filter component loses support) reaches the torchflower: `onBreak` in `main.js` now also runs on native support loss and calls the idempotent `flowerSupport.invalidate()`. Records are cleaned up sooner; piston jobs skip a popped flower, so no double drops. The support service is still needed (soil replaced by another valid soil).
- Unaffected: `collision_box: false` and the format 1.21.120 block (the single-object `collision_box` rejection starts at format 1.26.60; whether `false` and `selection_box` stay valid there is unknown, re-check before any bump); loot table has no format_version or functions; no lighting change for custom `light_emission`.
- Deferred: experimental `minecraft:neighbor_change` / `onNeighborChanged` (block format 1.26.60, beta API 2.12.0; 4,096 queued and 100 per tick per chunk) could detect flowing lava next to the flower (see TODO "revisit a supported native route") and part of the piston/support service. Wait for stable; note it in the TODO when it ships.
- `liquid_detection` is still water only, so the flowing-lava item is unchanged. No crop-growth event in 2.11.0; the crop poll stays (20 ticks).
- Owner checks on 26.60: break the soil under a placed flower (exactly one drop, no content-log warning); two rapid piston pushes of the soil (one pop, one drop); piston replacing the soil with another valid soil pops the flower; light 14, water pop, crop-to-flower after reload.

## Performance (2026-11-21, Bedrock 1.26.63; budget tests in `tests/crop_lifecycle.mjs`)

- Crop list: kept in memory (loaded once at worldLoad, written to the dynamic property only when it changes). Checker call: <= 32 chunk checks + <= 32 `getBlock`, no JSON parse (was: parse + one read per tracked crop, every second).
- Sweep / setup migration: a job step is one filtered column query plus at most 16 glow swaps, then it yields (was: every hit of the column in one step, up to 256 writes).
- Not measured in game (no DIAG build); the counts come from the counting mock. Tracking many crops at once (sweep end) is one dedupe pass plus one property write.
