import assert from 'node:assert/strict';
import {VoxelWorld,RECIPES,craft,toolLevel,requiredTool,drop,HEIGHT,LIMIT,PICK_DURABILITY,wearPickaxe} from '../game/blocklands/world.js';
import {freshHotbar,ownedHotbar,hasGroundContact} from '../game/blocklands/player.js';
import * as CANNON from '../game/blocklands/vendor/cannon-es.js';

const world=new VoxelWorld(291026),bag={},unlocks={};
assert.deepEqual(new VoxelWorld(123).chunk(0,0,'overworld'),new VoxelWorld(123).chunk(0,0,'overworld'),'Generation repeats for a saved seed');
assert.notDeepEqual(new VoxelWorld(123).chunk(0,0,'overworld'),new VoxelWorld(456).chunk(0,0,'overworld'),'Different seeds randomize terrain and resources');
for(const [id,max] of Object.entries(PICK_DURABILITY)){
  const tools={[id]:2,woodPick:id==='woodPick'?2:1},durability={};
  for(let i=0;i<max-1;i++)assert.equal(wearPickaxe(tools,durability),null);
  assert.equal(durability[id],1);
  const saved=JSON.parse(JSON.stringify(durability));
  assert.equal(wearPickaxe(tools,saved),id,'Pickaxe breaks at its exact limit');
  assert.equal(tools[id],1,'Only one pickaxe breaks');
  assert.equal(wearPickaxe(tools,saved),null,'Spare starts at full durability');
  assert.equal(saved[id],max-1);
}
assert.equal(wearPickaxe({},{}),null,'Hands do not wear out');
for(const seed of [291026,123,98765]){
  const terrain=new VoxelWorld(seed);let obsidianPatches=0,gravelPatches=0;const shapes=new Set();
  for(let cx=-2;cx<=2;cx++)for(let cz=-2;cz<=2;cz++)for(const id of [10,11]){
    const points=[];
    for(let x=cx*16;x<(cx+1)*16;x++)for(let z=cz*16;z<(cz+1)*16;z++){
      const y=id===10?5:terrain.surface(x,z);
      if(terrain.get(x,y,z,'overworld')===id)points.push([x,z]);
      if(id===10)assert.notEqual(terrain.get(x,terrain.surface(x,z),z,'overworld'),10,'No surface obsidian');
    }
    if(!points.length)continue;
    assert.equal(points.length,id===10?5:10,'Deposits have the requested block count');
    const seen=new Set(),queue=[points[0]],all=new Set(points.map(p=>p.join(',')));
    while(queue.length){const [x,z]=queue.pop(),key=`${x},${z}`;if(seen.has(key))continue;seen.add(key);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])if(all.has(`${x+dx},${z+dz}`))queue.push([x+dx,z+dz]);
    }
    assert.equal(seen.size,points.length,'Deposit footprint is connected');
    if(id===10)obsidianPatches++;else{gravelPatches++;const minX=Math.min(...points.map(p=>p[0])),minZ=Math.min(...points.map(p=>p[1]));shapes.add(points.map(([x,z])=>`${x-minX},${z-minZ}`).sort().join(';'));}
  }
  assert.ok(obsidianPatches>0&&gravelPatches>0&&shapes.size>1,'Seeds provide obsidian and varied gravel shapes');
}
for(const dimension of ['overworld','nether']){
  const terrain=new VoxelWorld(291026),ores=new Map(),visited=new Set();let largest=0;
  for(let x=-20;x<20;x++)for(let z=-20;z<20;z++)for(let y=1;y<32;y++){
    const id=terrain.get(x,y,z,dimension);if([7,8,9,18,25,26,28].includes(id))ores.set(`${x},${y},${z}`,id);
  }
  for(const [key,id] of ores){
    if(visited.has(key))continue;const queue=[key];visited.add(key);let count=0;
    while(queue.length){const p=queue.pop().split(',').map(Number);count++;
      for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){
        const next=`${p[0]+dx},${p[1]+dy},${p[2]+dz}`;
        if(ores.get(next)===id&&!visited.has(next)){visited.add(next);queue.push(next);}
      }
    }
    assert.ok(count<=6,`${dimension} ore vein contains at most six blocks`);largest=Math.max(largest,count);
  }
  assert.equal(largest,6,`${dimension} includes six-block veins`);
}
for(const seed of [291026,123,98765]){
  const terrain=new VoxelWorld(seed);let iron=0,diamond=0,halves=0;
  for(let x=-40;x<=40;x++)for(let z=-40;z<=40;z++){
    const h=terrain.surface(x,z),height=h+terrain.blockHeight(x,h,z,'overworld');
    if(height%1)halves++;
    for(const [dx,dz] of [[1,0],[0,1]]){
      const nh=terrain.surface(x+dx,z+dz);
      assert.ok(Math.abs(height-nh-terrain.blockHeight(x+dx,nh,z+dz,'overworld'))<=.5,'Natural steps are at most half a block');
    }
    for(let y=1;y<=h;y++){
      const id=terrain.get(x,y,z,'overworld');
      assert.ok(id!==0,'No underground sinkholes');
      if(id===8){iron++;assert.ok(y<=12&&y<=h-6,'Iron stays underground');}
      if(id===9){diamond++;assert.ok(y<=5,'Diamonds stay near bedrock');}
    }
  }
  assert.ok(iron>20&&diamond>20&&halves>100,'Seeds retain deep resources and half steps');
  const h=terrain.surface(0,0);terrain.set(0,h,0,3,'overworld');
  assert.equal(terrain.blockHeight(0,h,0,'overworld'),1,'Placed blocks retain full height');
}
function gather(id,count,dimension='overworld'){
  assert.ok(toolLevel(bag)>=requiredTool(id),`Tool can mine block ${id}`);
  let found=0;
  for(let x=-24;x<25&&found<count;x++)for(let z=-20;z<21&&found<count;z++)for(let y=HEIGHT-1;y>0&&found<count;y--){
    if(world.get(x,y,z,dimension)!==id)continue;
    world.set(x,y,z,0,dimension);const item=drop(id);bag[item]=(bag[item]||0)+1;found++;
  }
  assert.equal(found,count,`Enough block ${id} in ${dimension}`);
}
function make(item,times=1){for(let i=0;i<times;i++)assert.ok(craft(RECIPES.find(r=>r.item===item),bag,unlocks),`Craft ${item}`);}
gather(5,8);make('12',8);make('stick',3);make('22');make('woodPick');
gather(3,11);gather(7,4);make('stonePick');make('23');gather(8,4);make('iron',4);make('ironPick');
gather(9,3);make('diamondPick');gather(11,1);make('igniter');gather(10,10);make('netherPortal');
assert.equal(bag.netherPortal,1);
gather(25,6,'nether');gather(26,12,'nether');make('powder',6);make('eye',12);gather(3,12);make('endPortal');
assert.equal(bag.endPortal,1);
assert.equal(world.get(LIMIT,20,0,'overworld'),0);
for(const dimension of ['overworld','nether','end']){
  const [x,y,z]=world.landing(dimension);
  assert.ok(world.get(Math.floor(x),Math.floor(y)-3,Math.floor(z),dimension)>0,`${dimension} has a spawn floor`);
}
world.set(-17,20,-1,24,'end');
const restored=new VoxelWorld(world.seed,JSON.parse(JSON.stringify(world.edits)));
assert.equal(restored.get(-17,20,-1,'end'),24);
assert.equal(restored.get(25,12,25,'nether'),world.get(25,12,25,'nether'));
assert.equal(new VoxelWorld(123).get(500,20,-500,'overworld'),new VoxelWorld(123).get(500,20,-500,'overworld'));
assert.deepEqual(freshHotbar('survival'),Array(9).fill(null));
assert.deepEqual(ownedHotbar(freshHotbar('creative'),{},'survival'),Array(9).fill(null));
assert.equal(ownedHotbar(['5'],{'5':2},'survival')[0],'5');
const physics=new CANNON.World({gravity:new CANNON.Vec3(0,-24,0)});
physics.addBody(new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(4,.5,4)),position:new CANNON.Vec3(0,-.5,0)}));
const player=new CANNON.Body({mass:1,fixedRotation:true,shape:new CANNON.Box(new CANNON.Vec3(.3,.85,.3)),position:new CANNON.Vec3(0,2,0)});
physics.addBody(player);
for(let i=0;i<90;i++)physics.step(1/60);
assert.ok(hasGroundContact(player,physics.contacts),'Standing player has support even with solver penetration');
const floorY=player.position.y;player.velocity.y=8.5;
for(let i=0;i<20;i++)physics.step(1/60);
assert.ok(player.position.y>floorY+1,'Survival jump clears a one-block ledge');
assert.equal(hasGroundContact(player,physics.contacts),false,'Airborne player cannot jump again');
console.log('Passed: Survival crafting reaches both portals with generated resources; spawn floors; negative-coordinate edits; deterministic terrain; world boundary.');
console.log('Passed: empty Survival hotbar, old-save placeholder cleanup, grounded contact detection, jump height and airborne rejection.');
console.log('Passed: half-block natural steps across three seeds, solid ground without sinkholes, deep iron and diamonds, full-sized placed blocks.');
console.log('Passed: connected ore veins capped at six in both mining dimensions; all pickaxe lifetimes, breakage, spares and saved durability.');
console.log('Passed: five-block obsidian deposits at Y=5 and varied ten-block gravel surface patches across three seeds.');
