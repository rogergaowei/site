# Blocklands

Original browser voxel sandbox built with Three.js (MIT), cannon-es (MIT), and Lucide icons (ISC). Dependencies are vendored so game loading does not depend on a CDN. It uses generated pixel textures, not Minecraft artwork or code.

Each of the three dimensions covers 2,048 by 2,048 blocks, with chunks generated around the player. A browser-local save retains the world seed, edits, portals, inventory, progression, position, and mode. Clearing browser storage removes that save.

## Controls

- WASD or arrows: move; mouse: look; Space: jump.
- Left mouse: mine; right mouse: place; 1-9 or wheel: hotbar.
- E: inventory/crafting; click a material to assign it to the current hotbar slot.
- F or the portal button: enter a nearby portal.
- Shift: sprint in Survival; descend in Creative. Space ascends in Creative.
- Escape: pause. Phones have movement buttons, drag-to-look, and action buttons.

## Survival progression

Logs -> planks -> sticks and workbench -> wooden pickaxe -> stone pickaxe and furnace -> iron ingots -> iron pickaxe -> diamonds -> diamond pickaxe -> obsidian. Gravel drops flint. Ten obsidian and flint-and-steel craft a Nether portal kit. Select the kit and place it.

In the Nether, blaze crystals drop blaze rods, and pearl ore drops ender pearls. Six rods yield twelve powder; combine twelve powder and twelve pearls into twelve Eyes of Ender. Twelve Eyes and twelve stone craft an End portal kit. Destination dimensions provide a return portal.

The quarry east of Overworld spawn exposes coal, iron, and diamond ores. Obsidian lies west of spawn and gravel to the north. Nether pearl ore is east of its spawn, and blaze crystals southwest. Resources also occur throughout the world.

Run the progression checks with `node scripts/test-blocklands.mjs` from the repository root. Serve the site with a static HTTP server to play; JavaScript modules require HTTP.
