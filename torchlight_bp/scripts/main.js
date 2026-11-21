import { message } from "./messages.js";
import { world, system, BlockPermutation, BlockVolume } from "@minecraft/server";
import { createTorchflowerSupport, observePiston } from "./support.js";

// ---------------------------------------------------------------------------
// Glowing Torchflower
//
// Vanilla blocks are hardcoded and cannot be given a light_emission component,
// so we swap `minecraft:torchflower` for a visually identical custom block
// `torchlight:torchflower` that emits light 14.
//
// Design goal: NO continuous world scanning. We only ever look at positions we
// already know contain something interesting:
//   1. Flower placed by a player      -> playerPlaceBlock event (free)
//   2. Crop planted by a player       -> remember that ONE position, re-check it
//                                        on a slow timer until it matures
//   3. Other flowers/growing crops   -> existing migration or manual sweep;
//                                      discovered crops join the same registry
// ---------------------------------------------------------------------------

const VANILLA_FLOWER = "minecraft:torchflower";
const VANILLA_CROP   = "minecraft:torchflower_crop";
const GLOWING_FLOWER = "torchlight:torchflower";
const flowerSupport = createTorchflowerSupport(system);

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
    blockComponentRegistry.registerCustomComponent("torchlight:support", {
        onPlace({ block }) { flowerSupport.observe(block, { reset: true }); },
        onRandomTick({ block }) { flowerSupport.tick(block); },
        onBreak({ block }) { flowerSupport.invalidate(block.dimension, block.location); },
    });
});
world.afterEvents.pistonActivate.subscribe((event) => observePiston(flowerSupport, event));

const CROPS_PROP     = "torchlight:pending_crops";  // persisted across reloads
const MIGRATED_PROP  = "torchlight:migrated_v1";    // one-time first-run migration flag
const CROP_CHECK_INTERVAL = 20;                     // ticks (1s); was 100, a mature flower lit up after up to 5 s
const CROPS_PER_CHECK = 32;                         // crops read per interval (rotation); bounds the cost of one call
const SWEEP_WRITES_PER_STEP = 16;                   // glow swaps per job step
let cropTimer;

function syncCropTimer(list) {
    if (list.length && cropTimer === undefined) cropTimer = system.runInterval(checkPendingCrops, CROP_CHECK_INTERVAL);
    else if (!list.length && cropTimer !== undefined) { system.clearRun(cropTimer); cropTimer = undefined; }
}

// Manual sweep (/scriptevent torchlight:sweep)
const SWEEP_RADIUS   = 32;
const SWEEP_HEIGHT   = 16;

// First-run migration: wider than a manual sweep, since it only happens once per world.
// 97 x 49 x 97 ~= 460k blocks, walked incrementally by system.runJob over several
// seconds in the background. The player can keep playing while it runs.
const MIGRATE_RADIUS = 48;
const MIGRATE_HEIGHT = 24;

let sweepRunning = false;

// --- pending-crop bookkeeping ----------------------------------------------
// The list lives in memory (loaded once after worldLoad, the only writer) and is written to the
// dynamic property only when it changes. Never parse or stringify it per interval.

let crops;            // Array<{x,y,z,d}>, undefined until first use
let cropKeys;         // Set of "d|x,y,z"
let cropCursor = 0;   // rotation position of the checker

const cropKey = (d, x, y, z) => `${d}|${x},${y},${z}`;

function getCrops() {
    if (crops) return crops;
    crops = [];
    const raw = world.getDynamicProperty(CROPS_PROP);
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) crops = parsed;
        } catch { /* corrupt property: start empty */ }
    }
    cropKeys = new Set(crops.map((c) => cropKey(c.d, c.x, c.y, c.z)));
    return crops;
}

function savePendingCrops() {
    world.setDynamicProperty(CROPS_PROP, JSON.stringify(crops));
}

function trackCrop(loc, dimensionId) {
    trackCrops([loc], dimensionId);
}

/** Adds positions not yet tracked; returns how many were new. */
function trackCrops(positions, dimensionId) {
    if (!positions.length) return 0;
    const list = getCrops();
    let added = 0;
    for (const loc of positions) {
        const key = cropKey(dimensionId, loc.x, loc.y, loc.z);
        if (cropKeys.has(key)) continue;
        cropKeys.add(key);
        list.push({ x: loc.x, y: loc.y, z: loc.z, d: dimensionId });
        added++;
    }
    if (added) savePendingCrops();
    syncCropTimer(list);
    return added;
}

// --- the swap ---------------------------------------------------------------

function makeGlowing(block) {
    block.setPermutation(BlockPermutation.resolve(GLOWING_FLOWER));
    flowerSupport.observe(block, { reset: true });
}

// 1) Player places a torchflower -> swap immediately. Soil loss is native (placement
//    filter); the flower's own break, fire or explosion runs its onBreak.
world.afterEvents.playerPlaceBlock.subscribe((e) => {
    const block = e.block;
    if (block.typeId === VANILLA_FLOWER) {
        makeGlowing(block);
    } else if (block.typeId === VANILLA_CROP) {
        // Remember it so we can catch the moment it matures into a flower.
        trackCrop(block.location, block.dimension.id);
    }
}, { blockTypes: [VANILLA_FLOWER, VANILLA_CROP] });

// 2) Slow timer: re-check a bounded slice of the tracked crops per interval, in rotation.
//    At most CROPS_PER_CHECK entries per call, so a call costs the same on a 5-crop patch and on a
//    huge farm; <= 32 crops are all checked every interval. Unloaded chunks are skipped cheaply.
function checkPendingCrops() {
    const list = getCrops();
    if (list.length === 0) { syncCropTimer(list); return; }

    const len = list.length;
    const start = cropCursor % len;
    const n = Math.min(CROPS_PER_CHECK, len);
    let drop;

    for (let i = 0; i < n; i++) {
        const c = list[(start + i) % len];
        let block;
        try {
            const dim = world.getDimension(c.d);
            if (!dim.isChunkLoaded(c)) continue;    // unloaded - check again later
            block = dim.getBlock(c);
        } catch {
            continue;
        }
        if (!block) continue;

        if (block.typeId === VANILLA_FLOWER) {
            makeGlowing(block); // matured!
            (drop ??= new Set()).add(c);
        } else if (block.typeId !== VANILLA_CROP) {
            (drop ??= new Set()).add(c);    // crop was destroyed/replaced - stop tracking
        }
    }

    const next = start + n;     // first entry not yet checked, in the old list
    if (drop) {
        let before = 0;         // surviving entries before `next`, the new cursor
        crops = list.filter((c, i) => {
            if (drop.has(c)) { cropKeys.delete(cropKey(c.d, c.x, c.y, c.z)); return false; }
            if (i < next) before++;
            return true;
        });
        cropCursor = before;
        savePendingCrops();
    } else {
        cropCursor = next;
    }
    syncCropTimer(crops);
}

// 3) Existing finite sweep also discovers growing crops, regardless of planter.
//    Uses system.runJob and yields between reads so the engine can spread the
//    finite volume walk across ticks.
function sweepAround(player, radius, height, label) {
    if (sweepRunning) {
        player.sendMessage(message("sweep.busy"));
        return;
    }
    sweepRunning = true;

    const dim = player.dimension;
    const o = player.location;
    const ox = Math.floor(o.x), oy = Math.floor(o.y), oz = Math.floor(o.z);

    let converted = 0;
    let stepWrites = 0;
    let growing = 0;
    const discoveredCrops = [];

    // One filtered volume query per 16 x 16 column instead of one getBlock per
    // cell; only the matching locations are read, and control returns to the
    // game between columns. Y is clamped to the dimension's height range.
    let minY = oy - height, maxY = oy + height;
    try {
        minY = Math.max(minY, dim.heightRange.min);
        maxY = Math.min(maxY, dim.heightRange.max - 1);
    } catch { /* keep the unclamped range; getBlocks failures are skipped below */ }
    const filter = { includeTypes: [VANILLA_FLOWER, VANILLA_CROP] };

    system.runJob(function* () {
        if (minY <= maxY) {
            for (let x0 = ox - radius; x0 <= ox + radius; x0 += 16) {
                const x1 = Math.min(x0 + 15, ox + radius);
                for (let z0 = oz - radius; z0 <= oz + radius; z0 += 16) {
                    const z1 = Math.min(z0 + 15, oz + radius);
                    let hits = [];
                    try {
                        const found = dim.getBlocks(
                            new BlockVolume({ x: x0, y: minY, z: z0 }, { x: x1, y: maxY, z: z1 }),
                            filter, true);
                        hits = [...found.getBlockLocationIterator()];
                    } catch {
                        hits = [];  // unreadable column: skip it
                    }
                    for (const loc of hits) {
                        let block;
                        try {
                            block = dim.getBlock(loc);
                        } catch {
                            block = undefined;
                        }
                        const type = block?.typeId;
                        if (type === VANILLA_FLOWER) {
                            makeGlowing(block);
                            converted++;
                            if (++stepWrites >= SWEEP_WRITES_PER_STEP) { stepWrites = 0; yield; }
                        } else if (type === VANILLA_CROP) {
                            growing++;
                            discoveredCrops.push({ ...block.location });
                        }
                    }
                    yield; // hand control back to the game each column
                }
            }
        }
        const newlyTracked = trackCrops(discoveredCrops, dim.id);
        sweepRunning = false;
        if (converted > 0) player.sendMessage(message(`${label}.complete`, converted));
        else if (growing === 0) player.sendMessage(message(`${label}.empty`));
        if (newlyTracked > 0) player.sendMessage(message("crops.tracked", newlyTracked));
    }());
}

// Manual sweep, for bases far from where the migration ran.
system.afterEvents.scriptEventReceive.subscribe((e) => {
    if (e.id !== "torchlight:sweep") return;
    const player = e.sourceEntity;
    if (!player) return;
    player.sendMessage(message("sweep.start"));
    sweepAround(player, SWEEP_RADIUS, SWEEP_HEIGHT, "sweep");
}, { namespaces: ["torchlight"] });

// 4) First-run migration: convert torchflowers that already existed in the world
//    before the mod was installed. Runs ONCE per world, then never again.
world.afterEvents.playerSpawn.subscribe((e) => {
    if (!e.initialSpawn) return;
    if (world.getDynamicProperty(MIGRATED_PROP) === true) return;

    if (sweepRunning) return;
    e.player.sendMessage(message("setup.start"));
    sweepAround(e.player, MIGRATE_RADIUS, MIGRATE_HEIGHT, "setup");
    // Mark setup only after its message and background job have started.
    world.setDynamicProperty(MIGRATED_PROP, true);
});

world.afterEvents.worldLoad.subscribe(() => {
    syncCropTimer(getCrops());
    console.log("[Torchlight] Glowing Torchflower active (light 14).");
});
