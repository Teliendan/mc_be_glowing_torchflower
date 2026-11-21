# Torchflower support and pistons

Owner accepted the feature on 2026-10-09. Implementation commit:
`Implement torchflower piston support survival`.
Target: Bedrock 1.26.52 / stable Script API 2.8.0.

Flowers pop when pushed by a piston or when their original soil moves, even
if another valid soil replaces it. Native floor support accepts grass, dirt,
coarse dirt, podzol, rooted dirt (`dirt_with_roots`), moss, mud, farmland,
mycelium and muddy mangrove roots (the last two corrected 2026-10-21) and pale moss block (2026-11-21).
Native destruction drops one vanilla torchflower. Placement and conversions
warm support records immediately; sparse random ticks recover loaded flowers
without world scans. Unavailable chunks and
moving blocks remain unknown. The shared observer is
`scripts/support_motion_service.js`, maintained with Lothlorien's matching
script; `scripts/support.js` supplies the flower's support and loot rules.

Offline regressions cover flower configuration, valid replacement, pre-event tick ordering, an unrelated nearby
flower, duplicate piston jobs, native popping, random-tick soil conversion and reload recovery, plus an eleven-soil check that rejects
stone/sand. Run `.\mods verify torchlight` (includes `tests/run.mjs`). Pale moss block: the owner saw it hold vanilla
flowers (1.26.63, 2026-11-21).

Design rule (owner, 2026-10-11): no looping per-block timers. Piston events discover cold flowers, soil removed by players,
explosions or commands pops the flower natively (placement filter) and its `onBreak` forgets the record (TL-01, 2026-11-12: world-wide edit handlers removed), and native `onRandomTick` is an eventual fallback for commands, reloads and
timeouts (no recovery at randomTickSpeed 0). Removing the old [2,2] timer removed the reported game lag.

TL-01 verified in game (owner, 1.26.63, 2026-11-17): breaking the soil by hand or TNT beside the flower drops exactly one torchflower (T-1/T-2); a placed flower
glows at once and a piston swapping the soil for another valid soil, or pulling it away, pops the flower once (T-3/T-4).
Rapid pistons verified in game (owner, 1.26.63, 2026-11-21). Not checked in game: chunk reloads. Reusable guidance: workspace
.claude/skills/bedrock-scripting/references/performance.md.
