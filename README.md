# Torchlight for Minecraft Bedrock

Torchflowers glow with light level 14, as bright as a torch, as if their bloom were a real flame. Everything else about the flower stays vanilla.

> **Status: Not released yet.** The first test version will appear on the Releases page. Download: [Releases page](https://github.com/Teliendan/mc_be_torchlight/releases).

## Features

- **Placing:** a torchflower you place glows at once.
- **Growing:** torchflower seeds grow as normal, and the mature flower glows.
- **Flowers already in your world:** the first time you join a world with the add-on, it lights the torchflowers around you once, automatically.
- **Sweep:** to light flowers farther away, stand near them and run the chat command `/scriptevent torchlight:sweep`. It covers 32 blocks around you, and 16 up and down.
- **Still a torchflower:** breaking a glowing flower drops a normal torchflower. Dye, suspicious stew, composting, sniffer drops and trading stay vanilla.
- **Vanilla rules:** the flower grows on the same soils as before, pops when its soil is removed or moved by a piston, pops in water and burns in lava.
- **Languages:** English, Czech, German, French, Polish, Spanish (Spain and Mexico) and Portuguese (Portugal and Brazil). The translations are AI drafts; corrections are welcome.

## Install

1. Download the `.mcaddon` from the [Releases page](https://github.com/Teliendan/mc_be_torchlight/releases) once the first version is out.
2. Open the file with Minecraft; it imports both packs.
3. In the world settings, turn on the Torchlight **behavior pack** (its resource pack comes with it). New and existing worlds both work.

Requirements: tested on Minecraft Bedrock 1.26.63. No experimental toggles are needed. It works on its own and needs none of my other add-ons.

## Known issues

- A torchflower in a flower pot does not glow.
- The first-time setup lights only the flowers around you. Flowers in distant bases stay unlit until you run the sweep near them.
- If a farmer villager plants torchflower seeds (only possible when a player gives them seeds), the grown flower stays unlit until you run the sweep nearby.
- Bees do not take nectar from a glowing torchflower.
- On a large torchflower farm, a grown crop can take a few seconds to start glowing.

## Feedback

Found a bug or have an idea? Tell me through the [report form](https://teliendan.com/contact/?utm_source=github&utm_medium=referral&utm_campaign=profile&utm_content=readme#report).

## Credits

Made by [Teliendan](https://teliendan.com/?utm_source=github&utm_medium=referral&utm_campaign=profile&utm_content=readme).

- Code written with AI coding agents, directed and tested by Teliendan.
- The flower's texture is Minecraft's own torchflower sprite.

## Disclaimer

Unofficial add-on for Minecraft. Not affiliated with or endorsed by Mojang Studios or Microsoft. "Minecraft" is a trademark of Mojang Studios / Microsoft. Anything derived from vanilla Minecraft files remains Mojang's.

## Licence

See [LICENSE.md](LICENSE.md).

## For developers

How the glowing flower works, pack layout, tests and design notes: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## What's new

The changelog starts with the first release; see the [Releases page](https://github.com/Teliendan/mc_be_torchlight/releases).
