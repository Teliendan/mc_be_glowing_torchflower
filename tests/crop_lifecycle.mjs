import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let serial = 0;
async function harness(initial = []) {
    const callbacks = new Map(), subscribeOptions = new Map(), timers = new Map(), cells = new Map(), props = new Map(), jobs = [];
    props.set("torchlight:pending_crops", JSON.stringify(initial));
    let ready = false, writes = 0, nextTimer = 0;
    const events = new Proxy({}, { get: (_, name) => ({ subscribe(fn, options) {
        subscribeOptions.set(name, options);
        if (!callbacks.has(name)) callbacks.set(name, []);
        callbacks.get(name).push(fn);
    } }) });
    const fire = (name, event = {}) => { for (const fn of callbacks.get(name) || []) fn(event); };
    const key = p => `${p.x},${p.y},${p.z}`;
    const volumeCalls = [];
    const dimension = { id: "overworld", heightRange: { min: -64, max: 320 }, getBlock: p => cells.get(key(p)),
        getBlocks(volume, filter, allowUnloaded) {
            assert.equal(allowUnloaded, true, "sweep tolerates unloaded chunks");
            const { from, to } = volume;
            volumeCalls.push({ from, to, filter });
            const lo = (a, b) => Math.min(a, b), hi = (a, b) => Math.max(a, b), locations = [];
            for (const b of cells.values()) {
                const l = b.location;
                if (l.x >= lo(from.x, to.x) && l.x <= hi(from.x, to.x) && l.y >= lo(from.y, to.y) && l.y <= hi(from.y, to.y)
                    && l.z >= lo(from.z, to.z) && l.z <= hi(from.z, to.z) && filter.includeTypes.includes(b.typeId)) locations.push({ ...l });
            }
            return { getBlockLocationIterator: () => locations[Symbol.iterator]() };
        } };
    const world = { afterEvents: events, getDimension: () => dimension,
        getDynamicProperty(name) { assert.ok(ready,"world reads deferred until worldLoad"); return props.get(name); },
        setDynamicProperty(name,value) { writes++; props.set(name,value); } };
    const system = { beforeEvents: { startup: { subscribe() {} } }, afterEvents: events,
        runJob(generator) { jobs.push(generator); },
        runInterval(fn,ticks) { const id=++nextTimer; timers.set(id,{fn,ticks}); return id; },
        clearRun: id => timers.delete(id) };
    globalThis.__cropLifecycle = { world, system, message: (...args) => args, observePiston() {},
        createTorchflowerSupport: () => ({ observe() {}, invalidate() {} }),
        BlockPermutation: { resolve: typeId => ({ typeId }) },
        BlockVolume: class { constructor(from, to) { this.from = from; this.to = to; } } };
    const source = readFileSync(new URL("../torchlight_bp/scripts/main.js", import.meta.url), "utf8")
        .replace(/^import \{([^}]+)\} from "[^"]+";/gm,"const {$1} = globalThis.__cropLifecycle;");
    await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${serial++}`);
    delete globalThis.__cropLifecycle;
    assert.equal(timers.size,0,"no pre-world interval");
    ready=true; fire("worldLoad");
    const put = (x,typeId) => {
        const block={location:{x,y:0,z:0},typeId,dimension,setPermutation(p) { this.typeId=p.typeId; }};
        cells.set(key(block.location),block); return block;
    };
    const messages = [];
    const player = {dimension, location:{x:0,y:0,z:0},sendMessage(m){messages.push(m);}};
    return { timers, fire, callbacks, subscribeOptions, put, props, cells, jobs, volumeCalls, messages, player, get writes() { return writes; },
        sweep() { fire("scriptEventReceive",{id:"torchlight:sweep",sourceEntity:player}); },
        stepJob() { if(jobs[0]?.next().done) jobs.shift(); },
        finishJob() { let steps=0; while(jobs.length) { assert.ok(++steps < 5000); this.stepJob(); } },
        check() { for (const {fn,ticks} of [...timers.values()]) { assert.equal(ticks,100); fn(); } } };
}

{
    const h=await harness();
    assert.equal(h.timers.size,0,"empty world has no crop checker");
    const crop=h.put(0,"minecraft:torchflower_crop");
    h.fire("playerPlaceBlock",{block:crop}); h.fire("playerPlaceBlock",{block:crop});
    assert.equal(h.timers.size,1); assert.equal(h.writes,1,"duplicate crop is not persisted twice");
    const writes=h.writes;
    h.check(); assert.equal(h.writes,writes,"unchanged growing crop causes no property write");
    h.cells.clear(); h.check();
    assert.equal(h.timers.size,1,"unloaded crop remains pending");
    const mature=h.put(0,"minecraft:torchflower"); h.check();
    assert.equal(mature.typeId,"torchlight:torchflower"); assert.equal(h.timers.size,0);
    h.fire("playerPlaceBlock",{block:h.put(1,"minecraft:torchflower_crop")});
    assert.equal(h.timers.size,1,"later placement restarts checker");
    h.put(1,"minecraft:air"); h.check(); assert.equal(h.timers.size,0,"destroyed last crop stops checker");
}
{
    const h=await harness([{x:7,y:0,z:0,d:"overworld"}]);
    assert.equal(h.timers.size,1,"persisted crops restart checker at worldLoad");
    h.check(); assert.equal(h.timers.size,1);
    h.put(7,"minecraft:torchflower"); h.check(); assert.equal(h.timers.size,0);
    assert.deepEqual(JSON.parse(h.props.get("torchlight:pending_crops")),[]);
}
console.log("PASS production crop timer: idle, deduplication, maturity, unloaded retention and restart");

{
    const h=await harness();
    const crop=h.put(0,"minecraft:torchflower_crop");
    h.put(1,"minecraft:wheat");
    h.sweep(); h.finishJob();
    assert.equal(h.timers.size,1,"manual sweep enrolls native growing crops without a player placement");
    assert.deepEqual(JSON.parse(h.props.get("torchlight:pending_crops")),[{x:0,y:0,z:0,d:"overworld"}]);
    assert.ok(h.messages.some(m=>m[0]==="crops.tracked" && m[1]===1));
    assert.ok(!h.messages.some(m=>m[0]==="sweep.empty"),"finding crops must not report an empty sweep");
    const writes=h.writes;
    h.messages.length=0;
    h.sweep(); h.finishJob(); assert.equal(h.writes,writes,"repeat sweep deduplicates growing crops");
    assert.ok(!h.messages.some(m=>m[0]==="crops.tracked"),"repeat sweep reports only newly tracked crops");
    crop.typeId="minecraft:torchflower"; h.check();
    assert.equal(crop.typeId,"torchlight:torchflower"); assert.equal(h.timers.size,0);
    assert.equal(h.cells.get("1,0,0").typeId,"minecraft:wheat","other crops remain native and untracked");
    const first=h.volumeCalls[0];
    assert.deepEqual(first.filter,{includeTypes:["minecraft:torchflower","minecraft:torchflower_crop"]});
    assert.ok(h.volumeCalls.every(c=>c.to.x-c.from.x<=15 && c.to.z-c.from.z<=15),"queries are at most 16 x 16 columns");
    assert.ok(h.volumeCalls.every(c=>c.from.y>=-64 && c.to.y<=319),"Y is clamped to the dimension height range");
}
{
    const h=await harness(); h.put(0,"minecraft:torchflower"); const far=h.put(500,"minecraft:torchflower");
    h.sweep(); h.finishJob();
    assert.equal(h.cells.get("0,0,0").typeId,"torchlight:torchflower","flower in range is converted");
    assert.equal(far.typeId,"minecraft:torchflower","flower outside the sweep radius is untouched");
    assert.ok(h.messages.some(m=>m[0]==="sweep.complete" && m[1]===1));
}
{
    const h=await harness(); h.put(0,"minecraft:torchflower_crop");
    h.fire("playerSpawn",{initialSpawn:true,player:h.player}); h.finishJob();
    assert.equal(h.props.get("torchlight:migrated_v1"),true);
    assert.equal(h.timers.size,1,"one-time migration enrolls immature pre-existing crops");
    h.fire("playerSpawn",{initialSpawn:true,player:h.player}); assert.equal(h.jobs.length,0);
    h.put(0,"minecraft:torchflower"); h.check(); assert.equal(h.timers.size,0);
}
{
    const h=await harness();
    assert.equal(h.callbacks.has("playerBreakBlock"),false,"no world-wide break handler");
    assert.equal(h.callbacks.has("blockExplode"),false,"no world-wide explosion handler");
    assert.deepEqual(h.subscribeOptions.get("playerPlaceBlock"),{blockTypes:["minecraft:torchflower","minecraft:torchflower_crop"]});
}
console.log("PASS native crop discovery: manual/migration enrollment, deduplication and maturity");
