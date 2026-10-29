import assert from 'node:assert/strict';
import {VoxelWorld,RECIPES,craft,toolLevel,requiredTool,drop,HEIGHT,LIMIT} from '../game/blocklands/world.js';

const world=new VoxelWorld(291026),bag={},unlocks={};
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
console.log('Passed: Survival crafting reaches both portals with generated resources; spawn floors; negative-coordinate edits; deterministic terrain; world boundary.');
