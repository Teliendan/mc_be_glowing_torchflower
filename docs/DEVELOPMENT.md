# Glowing Torchflower: development

Folder: `glowing_torchflower` (repository `mc_be_glowing_torchflower`); wiki and site id: `glowing-torchflower`. Pack folders, the namespace and the sweep command still use the old working name `torchlight`.

- Vanilla blocks are hardcoded and cannot be given light, so the placed flower is swapped for a
  visually identical custom block `torchlight:torchflower` (light 14). The item, loot, dye, stew,
  sniffer drops and trading stay vanilla by identity; breaking the glowing flower drops a normal
  torchflower.
- In-game command: `/scriptevent torchlight:sweep` converts flowers and enrolls growing crops
  within 32 blocks, 16 up and down. The one-time setup sweep runs on a player's first spawn in a
  world and does not rerun on update.
- Packs: `torchlight_bp/` (JSON plus Script API in `scripts/`) and `torchlight_rp/`. Pack format
  and Script API: `@minecraft/server` 2.8.0, min engine 1.21.120 (`torchlight_bp/manifest.json`).
- `tools/make_torchflower_texture.py` copies the 16x16 vanilla torchflower sprite into the RP.
- Deploy with `.\mods deploy glowing_torchflower` from the workspace; build the add-on locally with
  `.\mods package glowing_torchflower`. Tests: `node tests/run.mjs` (also run by `.\mods verify glowing_torchflower`).
- Unreleased player-facing changes wait in `changes/`; `CHANGELOG.md` is written by the first
  release.
- Design, support rules, limits and in-game checks: [VANILLA_PARITY.md](VANILLA_PARITY.md),
  [SUPPORT_AND_PISTONS.md](SUPPORT_AND_PISTONS.md), [WATER.md](WATER.md); open work in
  [TODO.md](TODO.md).
- Localization: nine locales use a mod-scoped contextual catalog. Read
  [LOCALIZATION.md](LOCALIZATION.md) before adding or changing player-facing text.
