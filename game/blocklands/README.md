# Blocklands

Original browser voxel sandbox built with Three.js (MIT), cannon-es (MIT), and Lucide icons (ISC). Dependencies are vendored so game loading does not depend on a CDN. It uses generated pixel textures, not Minecraft artwork or code.

Each of the three dimensions covers 2,048 by 2,048 blocks, with chunks generated around the player. A browser-local save retains the world seed, edits, portals, inventory, progression, position, and mode. Clearing browser storage removes that save.

New Survival games start in the Overworld with an empty inventory and hotbar. Collected blocks and crafted equipment automatically fill available hotbar slots. Switching from Creative into Survival also starts an empty inventory in the Overworld while retaining world builds; resuming an existing Survival game keeps its earned inventory.

## Controls

- Arrow keys: move; W/S: look up/down; A/D: turn left/right; mouse: look; Space: jump.
- Left mouse: mine; right mouse or Return/Enter: place; 1-9 or wheel: hotbar.
- E: inventory/crafting; click a material to assign it to the current hotbar slot.
- F or the portal button: enter a nearby portal.
- Shift: sprint in Survival; descend in Creative. Space ascends in Creative.
- Escape: pause. Phones have movement buttons, drag-to-look, and action buttons.

## Survival progression

Logs -> planks -> sticks and workbench -> wooden pickaxe -> stone pickaxe and furnace -> iron ingots -> iron pickaxe -> diamonds -> diamond pickaxe -> obsidian. Gravel drops flint. Ten obsidian and flint-and-steel craft a Nether portal kit. Select the kit and place it.

In the Nether, blaze crystals drop blaze rods, and pearl ore drops ender pearls. Six rods yield twelve powder; combine twelve powder and twelve pearls into twelve Eyes of Ender. Twelve Eyes and twelve stone craft an End portal kit. Destination dimensions provide a return portal.

Overworld hills use half-block steps that Survival players can walk up without jumping. Placed blocks remain full-sized. Natural terrain has no artificial quarry or sinkholes. Ore locations vary with the world seed: iron occurs at Y 1-12, at least six blocks below the surface; diamonds occur only at Y 1-5. Coal is more widely available underground. Obsidian lies west of spawn and gravel to the north. Nether pearl ore is east of its spawn, and blaze crystals southwest.

Run the progression checks with `node scripts/test-blocklands.mjs` from the repository root. Serve the site with a static HTTP server to play; JavaScript modules require HTTP.
