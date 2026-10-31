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

Overworld hills use half-block steps that Survival players can walk up without jumping. Placed blocks remain full-sized. Natural terrain has no artificial quarry or sinkholes. Ores generate in seeded, connected veins of one to six blocks, separated so neighboring veins cannot merge. Iron occurs at Y 1-12, at least six blocks below the surface; diamonds occur only at Y 1-5. Coal is more widely available underground. Obsidian generates in randomly shaped five-block deposits at Y=5. Gravel forms randomly shaped ten-block patches on dry Overworld surfaces, following the terrain. These deposits replace the old fixed patches near spawn. Nether pearl ore, blaze crystals, quartz and glowstone occur in randomized veins throughout its terrain.

Nether blaze crystal and pearl ore occur only at Y 1-8, at least six blocks below the local surface. Only 40% of their formerly eligible veins remain, making them substantially rarer. Quartz and glowstone generation is unchanged.

Survival automatically uses the best owned pickaxe. Each successfully mined block uses one durability: wood 59, stone 131, iron 250, diamond 1,561. The tool indicator and inventory show remaining uses. Broken picks disappear; a spare of the same type starts with full durability, otherwise mining falls back to the next available tool. Remaining durability is saved with the world. Older saves start existing tools at full durability; Creative tools do not wear out.

Run the progression checks with `node scripts/test-blocklands.mjs` from the repository root. Serve the site with a static HTTP server to play; JavaScript modules require HTTP.
