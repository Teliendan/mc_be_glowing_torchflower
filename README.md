# Glowing Torchflower

Bedrock add-on that makes the torchflower emit light (level 14, like a torch), as if its bloom
were an actual flame.

Vanilla blocks are hardcoded and cannot be given light, so the placed flower is swapped for a
visually identical custom block (`torchlight:torchflower`) that glows. Everything else stays
vanilla: the item, dye, suspicious stew, sniffer drops and trading are untouched, and breaking
the glowing flower drops a normal torchflower.

- Placing a torchflower: it glows at once.
- Planting torchflower seeds: the crop grows as normal and the mature flower glows.
- Flowers already in the world: converted once, automatically, around you the first time you
  spawn in with the add-on. Far-away flowers, or crops planted by farmers, are converted by
  running `/scriptevent torchlight:sweep` nearby (radius 32 blocks, 16 up and down).
- Flowers keep vanilla support rules: they pop when their soil is removed or moved.

Built and tested against Bedrock 1.26.52 (Script API 2.8.0).

Packs: `torchlight_bp/` + `torchlight_rp/`. Deploy with `.\mods deploy torchlight` from the workspace root.
Download the add-on from the repo's GitHub Releases page, https://github.com/Teliendan/mc_be_torchlight/releases, or build it locally with `.\mods package torchlight` from the workspace root.
Design, support rules and in-game checks: [docs/VANILLA_PARITY.md](docs/VANILLA_PARITY.md),
[docs/SUPPORT_AND_PISTONS.md](docs/SUPPORT_AND_PISTONS.md). Tests: `.\mods verify torchlight`.

## Known limitations

- Normal potting uses the retained vanilla torchflower item and leaves a native potted plant;
  this pack does not make that pot glow. The separately obtained custom block item has no
  pot marker. Stable custom pot support exists; see the [parity notes](docs/VANILLA_PARITY.md)
  for the distinction and pending game checks.
- Migration on first load only sweeps a volume around the spawning player; distant bases need a
  manual `/scriptevent torchlight:sweep` run nearby.
- Torchflowers planted by vanilla farmers (only possible if a player gave them seeds) stay unlit
  until `/scriptevent torchlight:sweep` is run nearby. The one-time setup does not rerun on update.

## Localization

Nine locales use a mod-scoped contextual catalog. See [the localization notes](docs/LOCALIZATION.md) before adding or changing player-facing text.

## What's new

See [CHANGELOG.md](CHANGELOG.md) and the [Releases page](https://github.com/Teliendan/mc_be_torchlight/releases).
