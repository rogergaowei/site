export const SIZE = 16, HEIGHT = 48, LIMIT = 1024;
export const BLOCKS = [
  ['Air','#ffffff'],['Grass','#73aa45'],['Dirt','#8f633e'],['Stone','#858982'],['Sand','#e2d29a'],
  ['Log','#80603b'],['Leaves','#538d3e'],['Coal ore','#646963'],['Iron ore','#ac9c87'],['Diamond ore','#62d8d4'],
  ['Obsidian','#342944'],['Gravel','#9e9c94'],['Planks','#bd9459'],['Glass','#bedfda'],['Water','#54a6c9'],
  ['Netherrack','#a1493d'],['Basalt','#515355'],['Lava','#fa822b'],['Glowstone','#f6ce69'],['End stone','#d8d7a0'],
  ['End crystal','#b081d8'],['Bedrock','#343936'],['Workbench','#a77746'],['Furnace','#686d66'],['Brick','#bc6751'],
  ['Blaze crystal','#ffbd4a'],['Pearl ore','#50b6a8'],['Moss','#478453'],['Quartz','#e0d6c6']
].map(([name,color],id)=>({id,name,color}));
export const ITEMS = {
  ...Object.fromEntries(BLOCKS.slice(1).map(b=>[b.id,{name:b.name,color:b.color,block:b.id}])),
  coal:{name:'Coal',color:'#343936'},ironOre:{name:'Raw iron',color:'#b2a694'},iron:{name:'Iron ingot',color:'#d0d7d2'},
  diamond:{name:'Diamond',color:'#66e5dc'},flint:{name:'Flint',color:'#6d7173'},stick:{name:'Sticks',color:'#b68c54'},
  woodPick:{name:'Wooden pickaxe',color:'#be965c'},stonePick:{name:'Stone pickaxe',color:'#9ea49a'},ironPick:{name:'Iron pickaxe',color:'#d3dad5'},diamondPick:{name:'Diamond pickaxe',color:'#66e5dc'},
  igniter:{name:'Flint and steel',color:'#e7c994'},rod:{name:'Blaze rod',color:'#ffbd4a'},powder:{name:'Blaze powder',color:'#ffaa37'},pearl:{name:'Ender pearl',color:'#59bbad'},eye:{name:'Eye of Ender',color:'#8ac66c'},
  netherPortal:{name:'Nether portal',color:'#b36cfa'},endPortal:{name:'End portal',color:'#4bd4ad'}
};
export const RECIPES = [
  ['12',4,{'5':1}],['stick',4,{'12':2}],['22',1,{'12':4}],['woodPick',1,{'12':3,stick:2},'workbench'],
  ['stonePick',1,{'3':3,stick:2},'workbench'],['23',1,{'3':8},'workbench'],['iron',1,{ironOre:1,coal:1},'furnace'],
  ['ironPick',1,{iron:3,stick:2},'workbench'],['diamondPick',1,{diamond:3,stick:2},'workbench'],
  ['igniter',1,{iron:1,flint:1},'workbench'],['13',4,{'4':4,coal:1},'furnace'],['24',4,{'2':4,coal:1},'furnace'],
  ['netherPortal',1,{'10':10,igniter:1},'workbench'],['powder',2,{rod:1}],['eye',1,{pearl:1,powder:1}],
  ['endPortal',1,{eye:12,'3':12},'workbench']
].map(([item,count,cost,station])=>({item,count,cost,station}));
export const solid = id => id!==0 && id!==14 && id!==17;
export const drop = id => ({1:'2',7:'coal',8:'ironOre',9:'diamond',11:'flint',25:'rod',26:'pearl'}[id]||String(id));
export function toolLevel(bag){return bag.diamondPick?4:bag.ironPick?3:bag.stonePick?2:bag.woodPick?1:0;}
export function requiredTool(id){return id===10?4:id===9||id===25||id===26?3:id===8?2:[3,7,16,18,19,23,28].includes(id)?1:0;}
export function canCraft(recipe,bag,unlocks){return (!recipe.station||unlocks[recipe.station])&&Object.entries(recipe.cost).every(([id,n])=>(bag[id]||0)>=n);}
export function craft(recipe,bag,unlocks){if(!canCraft(recipe,bag,unlocks))return false;for(const [id,n] of Object.entries(recipe.cost))bag[id]-=n;bag[recipe.item]=(bag[recipe.item]||0)+recipe.count;if(recipe.item==='22')unlocks.workbench=true;if(recipe.item==='23')unlocks.furnace=true;return true;}
function hash(x,z,seed){let n=Math.imul(x,374761393)^Math.imul(z,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function smooth(t){return t*t*(3-2*t);}
function noise(x,z,seed){const a=Math.floor(x),b=Math.floor(z),u=smooth(x-a),v=smooth(z-b);return (hash(a,b,seed)*(1-u)+hash(a+1,b,seed)*u)*(1-v)+(hash(a,b+1,seed)*(1-u)+hash(a+1,b+1,seed)*u)*v;}
export class VoxelWorld {
  constructor(seed=291026,edits={}){this.seed=seed;this.edits=edits;this.chunks=new Map();}
  surface(x,z,dimension='overworld'){
    const n=noise(x/42,z/42,this.seed),n2=noise(x/13,z/13,this.seed+17);
    if(dimension==='end')return 16+Math.floor(n*5);
    if(dimension==='nether')return 12+Math.floor(n*9+n2*3);
    return Math.floor(this.terrainLevel(x,z));
  }
  terrainLevel(x,z){return 14+Math.floor((noise(x/64,z/64,this.seed)*9+noise(x/32,z/32,this.seed+17)*3)*2)/2;}
  blockHeight(x,y,z,dimension){
    if(dimension!=='overworld'||y!==this.surface(x,z,dimension))return 1;
    const cx=Math.floor(x/SIZE),cz=Math.floor(z/SIZE),i=x-cx*SIZE+SIZE*(z-cz*SIZE+SIZE*y);
    if(Object.hasOwn(this.edits[`${dimension}:${cx}:${cz}`]||{},i))return 1;
    return this.terrainLevel(x,z)%1===0 ? .5 : 1;
  }
  chunk(cx,cz,dimension){
    const key=`${dimension}:${cx}:${cz}`;if(this.chunks.has(key))return this.chunks.get(key);
    const data=new Uint8Array(SIZE*SIZE*HEIGHT);const put=(x,y,z,id)=>{if(x>=0&&x<SIZE&&z>=0&&z<SIZE&&y>=0&&y<HEIGHT)data[x+SIZE*(z+SIZE*y)]=id;};
    for(let x=0;x<SIZE;x++)for(let z=0;z<SIZE;z++){
      const wx=cx*SIZE+x,wz=cz*SIZE+z;if(Math.abs(wx)>=LIMIT||Math.abs(wz)>=LIMIT)continue;
      const h=this.surface(wx,wz,dimension);const islands=dimension!=='end'||Math.hypot(wx,wz)<42||noise(wx/35,wz/35,this.seed+71)>.46;
      if(!islands)continue;
      const top=h;
      for(let y=0;y<=Math.max(top,dimension==='nether'?15:16);y++){
        let id=0;const r=hash(wx+y*157,wz+y*43,this.seed);
        if(dimension==='overworld'){
          if(y===0)id=21;else if(y<=top){id=y===top?(h<17?4:1):y>top-3?2:3;if(id===3){if(y<=5&&r<.018)id=9;else if(y<=12&&y<=top-6&&r<.06)id=8;else if(r<.105)id=7;}if(wx>=5&&wx<=9&&wz>=-8&&wz<=-4&&y===top)id=11;if(wx>=-12&&wx<=-7&&wz>=-5&&wz<=0&&y>=top-1)id=10;}else if(y<=16)id=14;
        }else if(dimension==='nether'){
          if(y===0)id=21;else if(y<=h)id=r<.05?18:r<.13?28:y<h-3?16:15;else if(y<=15)id=17;
          if(wx>=5&&wx<=12&&wz>=3&&wz<=8&&y===h)id=26;
          if(wx>=-12&&wx<=-5&&wz>=6&&wz<=11&&y===h)id=25;
        }else if(y>=h-7&&y<=h)id=(y===h&&r<.035)?20:19;
        put(x,y,z,id);
      }
    }
    if(dimension==='overworld')for(let x=2;x<14;x++)for(let z=2;z<14;z++){
      const wx=cx*SIZE+x,wz=cz*SIZE+z,h=this.surface(wx,wz,dimension);
      if(h<17||((hash(wx,wz,this.seed+9)>.014)&&!(wx===6&&wz===4))||Math.hypot(wx,wz)<5||this.blockHeight(wx,h,wz,dimension)<1)continue;
      for(let y=h+1;y<=h+5;y++)put(x,y,z,5);
      for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=3;dy<=6;dy++)if(Math.abs(dx)+Math.abs(dz)+(dy===6?1:0)<4&&(dx||dz||dy===6))put(x+dx,h+dy,z+dz,6);
    }
    if(dimension==='end'){
      const towers=[[20,0],[14,14],[0,20],[-14,14],[-20,0],[-14,-14],[0,-20],[14,-14]];
      towers.forEach(([tx,tz],i)=>{for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(let y=this.surface(tx,tz,dimension)+1;y<=34+i%3*3;y++)put(tx+dx-cx*SIZE,y,tz+dz-cz*SIZE,10);put(tx-cx*SIZE,35+i%3*3,tz-cz*SIZE,20);});
    }
    for(const [position,id] of Object.entries(this.edits[key]||{}))data[Number(position)]=id;
    this.chunks.set(key,data);return data;
  }
  get(x,y,z,dimension){if(y<0||y>=HEIGHT||Math.abs(x)>=LIMIT||Math.abs(z)>=LIMIT)return 0;const cx=Math.floor(x/SIZE),cz=Math.floor(z/SIZE);return this.chunk(cx,cz,dimension)[x-cx*SIZE+SIZE*(z-cz*SIZE+SIZE*y)];}
  set(x,y,z,id,dimension){if(y<1||y>=HEIGHT||Math.abs(x)>=LIMIT||Math.abs(z)>=LIMIT)return false;const cx=Math.floor(x/SIZE),cz=Math.floor(z/SIZE),i=x-cx*SIZE+SIZE*(z-cz*SIZE+SIZE*y),key=`${dimension}:${cx}:${cz}`;this.chunk(cx,cz,dimension)[i]=id;(this.edits[key]??={})[i]=id;return true;}
  landing(dimension,x=0,z=0){return [x+.5,this.surface(x,z,dimension)+3,z+.5];}
}
