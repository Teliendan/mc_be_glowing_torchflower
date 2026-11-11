# Localization

Workflow and checks: workspace `docs/localization.md`.

2026-10-04; target Bedrock 1.26.52 / Script API 2.8.0.
Commit: `Localize torchlight with contextual catalogs and nine locales`.

Owner approved (2026-10-04) English, Czech, Spanish Spain/Mexico, Portuguese Portugal/Brazil, German, French and Polish, with context and localization required during future development. Catalogs are mod-scoped (`localization/catalog.json`); en_GB=en_US and fr_CA=fr_FR are compatibility aliases.

Review status: eight target locales are AI-authored contextual drafts (`ai-draft`). No native-language review or game testing of this localization pass is claimed.

Vanilla terminology: Mojang bedrock-samples commit `46ba6ea985fb5a92d79a9419198f10dda14c199d`, documented not verified in game. Shared terms: workspace `docs/localization-terminology.json`.

## Mod-specific rules

Match Bedrock torchflower names from the pinned Mojang reference, not Java names or literal translations. Sweep and one-time setup have separate complete messages. Count labels avoid fragile plural grammar.

2026-10-21: added the growing-crop registration message for setup/sweep, with all nine locales and aliases. Crop-only discovery no longer reports an empty sweep; the count describes crops found, including already registered ones.
