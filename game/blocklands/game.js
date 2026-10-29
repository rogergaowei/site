import * as THREE from './vendor/three.module.js';
import * as CANNON from './vendor/cannon-es.js';
import {VoxelWorld,BLOCKS,ITEMS,RECIPES,SIZE,HEIGHT,LIMIT,solid,drop,toolLevel,requiredTool,canCraft,craft} from './world.js';
import {freshHotbar,ownedHotbar,hasGroundContact} from './player.js';

const $=id=>document.getElementById(id),canvas=$('world'),menu=$('menu'),inventory=$('inventory');
const STORAGE='roger-blocklands-v1';
const TOUCH=matchMedia('(pointer:coarse)').matches;
function captureMouse(){if(!TOUCH)canvas.requestPointerLock?.()?.catch(()=>{});}
let stored=null;try{stored=JSON.parse(localStorage.getItem(STORAGE));if(stored?.version!==1)stored=null;}catch{}
let seed=stored?.seed||291026,mode=stored?.mode||'survival',dimension=stored?.dimension||'overworld';
let world=new VoxelWorld(seed,stored?.edits||{}),bag=stored?.bag||{},unlocks=stored?.unlocks||{},portals=stored?.portals||[];
let hotbar=ownedHotbar(stored?.hotbar||freshHotbar(mode),bag,mode),selected=0;
let yaw=stored?.yaw??-2.2,pitch=stored?.pitch??-.12,health=stored?.health||20,viewDistance=3;
let active=false,started=false,last=0,lastSave=0,toastUntil=0,portalCooldown=0,damageTimer=0,collisionAnchor='',chunkAnchor='';
let mining=false,mineTarget='',mineTime=0,hit=null,nearestPortal=null,touchLook=null;
let jumpBuffer=0,groundGrace=0;
const keys=new Set(),meshes=new Map(),colliders=new Map(),queue=[],portalMeshes=[];
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:false,preserveDrawingBuffer:true});}
catch{document.body.innerHTML='<main style="padding:30px"><h1>Blocklands needs WebGL</h1><p>Open this game in a browser with hardware acceleration enabled.</p><a href="/game/">Back to games</a></main>';throw new Error('WebGL unavailable');}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.05,200);
camera.rotation.order='YXZ';
const skyLight=new THREE.HemisphereLight(0xe7f4ff,0x85836a,2.3);scene.add(skyLight);
const sunLight=new THREE.DirectionalLight(0xffedce,2.1);sunLight.position.set(30,70,25);scene.add(sunLight);

function textureAtlas(){
  const image=document.createElement('canvas');image.width=32*16;image.height=16;const ctx=image.getContext('2d');
  const colors=[...BLOCKS.map(b=>b.color),'#896640','#b08a55'];
  for(let t=0;t<colors.length;t++){
    ctx.fillStyle=colors[t];ctx.fillRect(t*16,0,16,16);
    for(let p=0;p<78;p++){const x=(p*7+t*3)%16,y=(p*11+Math.floor(p/16)*3)%16;ctx.fillStyle=p%2?'#ffffff13':'#00000020';ctx.fillRect(t*16+x,y,2,2);}
    if(t===29){ctx.fillStyle='#75a647';ctx.fillRect(t*16,0,16,4);for(let i=0;i<16;i+=3)ctx.fillRect(t*16+i,4,2,2);}
    if(t===5){ctx.fillStyle='#513f2c77';for(let i=1;i<16;i+=4)ctx.fillRect(t*16+i,0,2,16);}
    if([7,8,9,25,26,28].includes(t)){ctx.fillStyle=({7:'#323735',8:'#d1ac88',9:'#85fff0',25:'#fff0a1',26:'#82f6cf',28:'#f7ede3'})[t];for(let i=0;i<5;i++)ctx.fillRect(t*16+(i*7)%12+1,(i*3)%12+2,3,3);}
    if(t===10){ctx.fillStyle='#976ec066';ctx.fillRect(t*16+3,3,5,2);ctx.fillRect(t*16+9,10,4,3);}
    if(t===12||t===22){ctx.fillStyle='#60432177';for(let i=3;i<16;i+=4)ctx.fillRect(t*16,i,16,1);}
  }
  const tex=new THREE.CanvasTexture(image);tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
const atlas=textureAtlas(),material=new THREE.MeshLambertMaterial({map:atlas,vertexColors:true});
const glassMaterial=new THREE.MeshLambertMaterial({map:atlas,vertexColors:true,transparent:true,opacity:.48,depthWrite:false});
const faces=[
  {n:[1,0,0],v:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],s:.82},
  {n:[-1,0,0],v:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]],s:.66},
  {n:[0,1,0],v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],s:1},
  {n:[0,-1,0],v:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],s:.48},
  {n:[0,0,1],v:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]],s:.88},
  {n:[0,0,-1],v:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]],s:.74}
];
function buildChunk(cx,cz){
  const groups=[{p:[],n:[],u:[],c:[]},{p:[],n:[],u:[],c:[]}],data=world.chunk(cx,cz,dimension);
  for(let y=0;y<HEIGHT;y++)for(let z=0;z<SIZE;z++)for(let x=0;x<SIZE;x++){
    const id=data[x+SIZE*(z+SIZE*y)];if(!id)continue;const wx=cx*SIZE+x,wz=cz*SIZE+z;
    for(const face of faces){
      const neighbor=world.get(wx+face.n[0],y+face.n[1],wz+face.n[2],dimension);
      if(neighbor&&neighbor!==13&&neighbor!==14&&neighbor!==17||neighbor===id)continue;
      const g=groups[id===13?1:0],tile=id===1&&face.n[1]===0?29:id===5&&face.n[1]!==0?30:id;
      const brightness=[17,18,20,25,26].includes(id)?1:face.s,uv=[[.03,.03],[.03,.97],[.97,.97],[.97,.03]];
      for(const i of [0,1,2,0,2,3]){const v=face.v[i];g.p.push(wx+v[0],y+v[1],wz+v[2]);g.n.push(...face.n);g.u.push((tile+uv[i][0])/32,uv[i][1]);g.c.push(brightness,brightness,brightness);}
    }
  }
  const group=new THREE.Group();
  groups.forEach((g,i)=>{if(!g.p.length)return;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(g.p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(g.n,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(g.u,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(g.c,3));geometry.computeBoundingSphere();group.add(new THREE.Mesh(geometry,i?glassMaterial:material));});
  const key=`${cx}:${cz}`;if(meshes.has(key))disposeChunk(meshes.get(key));scene.add(group);meshes.set(key,group);
}
function disposeChunk(group){scene.remove(group);group.children.forEach(mesh=>mesh.geometry.dispose());}
function updateChunks(force=false){
  const cx=Math.floor(player.position.x/SIZE),cz=Math.floor(player.position.z/SIZE),anchor=`${cx}:${cz}:${viewDistance}`;
  if(!force&&anchor===chunkAnchor)return;chunkAnchor=anchor;queue.length=0;
  for(const [key,mesh] of meshes){const [x,z]=key.split(':').map(Number);if(Math.abs(x-cx)>viewDistance||Math.abs(z-cz)>viewDistance){disposeChunk(mesh);meshes.delete(key);}}
  for(let dx=-viewDistance;dx<=viewDistance;dx++)for(let dz=-viewDistance;dz<=viewDistance;dz++){const x=cx+dx,z=cz+dz;if(!meshes.has(`${x}:${z}`)&&Math.abs(x*SIZE)<LIMIT&&Math.abs(z*SIZE)<LIMIT)queue.push([x,z]);}
  queue.sort((a,b)=>(a[0]-cx)**2+(a[1]-cz)**2-((b[0]-cx)**2+(b[1]-cz)**2));
  for(const key of world.chunks.keys()){const [d,x,z]=key.split(':');if(d!==dimension||Math.abs(Number(x)-cx)>viewDistance+2||Math.abs(Number(z)-cz)>viewDistance+2)world.chunks.delete(key);}
}
function changed(x,z){const cx=Math.floor(x/SIZE),cz=Math.floor(z/SIZE);for(const [a,b] of [[cx,cz],[cx-1,cz],[cx+1,cz],[cx,cz-1],[cx,cz+1]])if(meshes.has(`${a}:${b}`))buildChunk(a,b);collisionAnchor='';}

const physics=new CANNON.World({gravity:new CANNON.Vec3(0,-24,0)});physics.broadphase=new CANNON.SAPBroadphase(physics);physics.defaultContactMaterial.friction=0;
const player=new CANNON.Body({mass:1,shape:new CANNON.Box(new CANNON.Vec3(.3,.85,.3)),fixedRotation:true,linearDamping:0,collisionFilterGroup:2});
player.position.set(...(stored?.position||world.landing(dimension)));physics.addBody(player);
const blockShape=new CANNON.Box(new CANNON.Vec3(.5,.5,.5));
function updateColliders(){
  const px=Math.floor(player.position.x),py=Math.floor(player.position.y),pz=Math.floor(player.position.z),anchor=`${px}:${py}:${pz}`;if(anchor===collisionAnchor)return;collisionAnchor=anchor;const needed=new Set();
  for(let x=px-2;x<=px+2;x++)for(let z=pz-2;z<=pz+2;z++)for(let y=py-3;y<=py+2;y++)if(solid(world.get(x,y,z,dimension))){const key=`${x}:${y}:${z}`;needed.add(key);if(!colliders.has(key)){const body=new CANNON.Body({mass:0,shape:blockShape,position:new CANNON.Vec3(x+.5,y+.5,z+.5),collisionFilterGroup:1});physics.addBody(body);colliders.set(key,body);}}
  for(const [key,body] of colliders)if(!needed.has(key)){physics.removeBody(body);colliders.delete(key);}
}
function grounded(){return hasGroundContact(player,physics.contacts);}
const raycaster=new THREE.Raycaster();raycaster.far=6;
const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006,1.006,1.006)),new THREE.LineBasicMaterial({color:0xffffff}));outline.visible=false;scene.add(outline);
const cloudGroup=new THREE.Group();const cloudMaterial=new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:.85});
for(let i=0;i<18;i++){const cloud=new THREE.Mesh(new THREE.BoxGeometry(8+i%3*3,1.2,4+i%4),cloudMaterial);cloud.position.set((i*37)%190-95,43+(i%3)*2,(i*53)%190-95);cloudGroup.add(cloud);}scene.add(cloudGroup);
const sun=new THREE.Mesh(new THREE.BoxGeometry(7,7,1),new THREE.MeshBasicMaterial({color:0xffefb0}));scene.add(sun);
const starPositions=[];for(let i=0;i<800;i++){const angle=i*2.399963,height=.12+(i%127)/150,radius=Math.sqrt(1-Math.min(.99,height)**2);starPositions.push(Math.cos(angle)*radius*110,height*110,Math.sin(angle)*radius*110);}
const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xe7d8ff,size:.32,fog:false}));scene.add(stars);
const portalGeometry=new THREE.BoxGeometry(1,1,1),frameMaterials={nether:new THREE.MeshLambertMaterial({color:0x382a4e}),end:new THREE.MeshLambertMaterial({color:0x74987d})};
function refreshPortals(){
  portalMeshes.forEach(g=>{scene.remove(g);g.children.forEach(c=>{if(c.userData.portalSurface)c.material.dispose();});});portalMeshes.length=0;
  for(const p of portals.filter(p=>p.dimension===dimension)){
    const group=new THREE.Group(),isEnd=p.target==='end',mat=new THREE.MeshBasicMaterial({color:isEnd?0x4deac3:0xb263ff,transparent:true,opacity:.7,side:THREE.DoubleSide});
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(isEnd?3:2,3),mat);plane.userData.portalSurface=true;
    if(isEnd){plane.rotation.x=-Math.PI/2;plane.position.set(p.x+2.5,p.y+1.05,p.z+2.5);}else plane.position.set(p.x+2,p.y+2.5,p.z+.5);
    group.add(plane);scene.add(group);portalMeshes.push(group);
  }
}
function createPortal(target,x,z){
  const y=world.surface(x,z,dimension)+1,isEnd=target==='end';
  if(isEnd){for(let dx=0;dx<5;dx++)for(let dz=0;dz<5;dz++)world.set(x+dx,y,z+dz,dx===0||dx===4||dz===0||dz===4?19:0,dimension);}
  else{for(let dx=0;dx<4;dx++)for(let dy=0;dy<5;dy++)world.set(x+dx,y+dy,z,dx===0||dx===3||dy===0||dy===4?10:0,dimension);}
  portals.push({dimension,target,x,y,z});changed(x,z);changed(x+4,z+4);refreshPortals();saveWorld(false);
}
function setAtmosphere(){
  const color=dimension==='nether'?0x6f302b:dimension==='end'?0x272337:0xb8dded;
  scene.background=new THREE.Color(color);scene.fog=new THREE.Fog(color,viewDistance*SIZE*.65,viewDistance*SIZE+9);
  skyLight.color.setHex(dimension==='nether'?0xffb48b:dimension==='end'?0xc2b9ed:0xe7f4ff);
  skyLight.intensity=dimension==='overworld'?2.3:2;sunLight.intensity=dimension==='overworld'?2.1:.9;cloudGroup.visible=dimension==='overworld';sun.visible=dimension==='overworld';stars.visible=dimension==='end';
  $('dimension').textContent=({overworld:'Overworld',nether:'Nether',end:'The End'})[dimension];
}
function enterPortal(){
  if(!nearestPortal||performance.now()<portalCooldown)return;const destination=nearestPortal.target;
  dimension=destination;player.position.set(...world.landing(dimension));player.velocity.setZero();
  meshes.forEach(disposeChunk);meshes.clear();colliders.forEach(b=>physics.removeBody(b));colliders.clear();world.chunks.clear();chunkAnchor='';collisionAnchor='';
  if(!portals.some(p=>p.dimension===dimension))createPortal(dimension==='overworld'?'nether':'overworld',5,0);
  setAtmosphere();refreshPortals();updateChunks(true);portalCooldown=performance.now()+3000;toast(`Entered ${$('dimension').textContent}`);saveWorld(false);
}

function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');toastUntil=performance.now()+3000;}
function saveWorld(notify=true){
  try{localStorage.setItem(STORAGE,JSON.stringify({version:1,seed,mode,dimension,bag,unlocks,portals,hotbar,edits:world.edits,position:player.position.toArray(),yaw,pitch,health}));$('save-status').textContent=`Saved ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;if(notify)toast('World saved');}
  catch{toast('Storage is full or unavailable. This world cannot be saved.');}
}
function renderHotbar(){
  hotbar=ownedHotbar(hotbar,bag,mode);
  $('hotbar').replaceChildren(...hotbar.map((id,i)=>{const button=document.createElement('button');button.className=`slot${i===selected?' active':''}`;button.title=`${ITEMS[id]?.name||'Empty'} (${i+1})`;button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(i===selected));button.innerHTML=`<kbd>${i+1}</kbd>${id?`<span class="swatch" style="background:${ITEMS[id].color}"></span><small>${mode==='creative'?'∞':bag[id]}</small>`:''}`;button.onclick=()=>{selected=i;renderHotbar();};return button;}));
  const level=toolLevel(bag);$('tool').textContent=mode==='creative'?'Creative':level?ITEMS[['','woodPick','stonePick','ironPick','diamondPick'][level]].name:'Hands';
  $('touch-jump').textContent=mode==='creative'?'Up':'Jump';$('touch-down').hidden=mode!=='creative';
}
function offerHotbarItem(id){
  hotbar=ownedHotbar(hotbar,bag,mode);
  if(!ITEMS[id]?.block&&!id.endsWith('Pick')&&!id.endsWith('Portal'))return;
  let slot=hotbar.indexOf(id);
  if(slot===-1){slot=hotbar.indexOf(null);if(slot!==-1)hotbar[slot]=id;}
  if(!hotbar[selected]&&slot!==-1)selected=slot;
}
function renderInventory(){
  $('items').replaceChildren(...Object.entries(ITEMS).filter(([id])=>Number(id)!==21&&(mode==='creative'||bag[id]>0&&Number(id)!==14&&Number(id)!==17)).map(([id,item])=>{
    const button=document.createElement('button');button.className=`item${hotbar[selected]===id?' active':''}`;button.innerHTML=`<span class="swatch" style="background:${item.color}"></span>${item.name}<br>${mode==='creative'?'∞':bag[id]||0}`;
    button.title=`Select ${item.name}`;button.onclick=()=>{hotbar[selected]=id;renderHotbar();renderInventory();};return button;
  }));
  if(!$('items').childElementCount)$('items').textContent='Empty inventory';
  $('recipes').replaceChildren(...RECIPES.map(recipe=>{
    const row=document.createElement('div');row.className='recipe';const needs=Object.entries(recipe.cost).map(([id,n])=>`${n} ${ITEMS[id].name}`).join(' + ');
    const station=mode!=='creative'&&recipe.station&&!unlocks[recipe.station]?` · ${recipe.station==='workbench'?'Workbench':'Furnace'} required`:'';
    row.innerHTML=`<div><strong>${ITEMS[recipe.item].name}${recipe.count>1?` ×${recipe.count}`:''}</strong><small>${needs}${station}</small></div>`;
    const button=document.createElement('button');button.textContent='Craft';button.disabled=mode!=='creative'&&!canCraft(recipe,bag,unlocks);button.onclick=()=>{if(mode==='creative'){bag[recipe.item]=(bag[recipe.item]||0)+recipe.count;if(recipe.item==='22')unlocks.workbench=true;if(recipe.item==='23')unlocks.furnace=true;}else if(!craft(recipe,bag,unlocks))return;offerHotbarItem(recipe.item);renderInventory();renderHotbar();toast(`Crafted ${ITEMS[recipe.item].name}`);saveWorld(false);};row.append(button);return row;
  }));
}
function openInventory(){mining=false;keys.clear();inventory.showModal();document.exitPointerLock?.();renderInventory();}
function resume(){
  const nextMode=document.querySelector('[data-mode].selected').dataset.mode;
  if(nextMode!==mode){
    hotbar=freshHotbar(nextMode);selected=0;
    if(nextMode==='survival'){
      bag={};unlocks={};dimension='overworld';health=20;player.position.set(...world.landing(dimension));player.velocity.setZero();
      meshes.forEach(disposeChunk);meshes.clear();colliders.forEach(b=>physics.removeBody(b));colliders.clear();chunkAnchor='';collisionAnchor='';refreshPortals();
    }
  }
  menu.close();active=true;started=true;keys.clear();jumpBuffer=0;groundGrace=0;mode=nextMode;viewDistance=Number($('distance').value);setAtmosphere();renderHotbar();updateChunks(true);captureMouse();
}
function pause(){active=false;mining=false;keys.clear();if(inventory.open)inventory.close();if(!menu.open)menu.showModal();$('play').textContent=started?'Resume':'Play';$('seed').disabled=started||!!stored;document.exitPointerLock?.();saveWorld(false);}
function reset(){
  if($('new').dataset.confirm!=='yes'){ $('new').dataset.confirm='yes';$('new').textContent='Replace saved world?';$('seed').disabled=false;return; }
  seed=Math.max(1,Math.min(999999999,Number($('seed').value)||291026));world=new VoxelWorld(seed);bag={};unlocks={};portals=[];dimension='overworld';health=20;mode=document.querySelector('[data-mode].selected').dataset.mode;hotbar=freshHotbar(mode);selected=0;
  meshes.forEach(disposeChunk);meshes.clear();colliders.forEach(b=>physics.removeBody(b));colliders.clear();player.position.set(...world.landing(dimension));player.velocity.setZero();stored=null;chunkAnchor='';collisionAnchor='';yaw=-2.2;pitch=-.12;refreshPortals();started=false;$('seed').disabled=false;$('new').dataset.confirm='';$('new').textContent='New world';setAtmosphere();updateChunks(true);renderHotbar();saveWorld(false);resume();
}
function updateTarget(){
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);const objects=[];meshes.forEach(g=>objects.push(...g.children));const intersection=raycaster.intersectObjects(objects,false)[0];
  if(!intersection){hit=null;outline.visible=false;$('target').textContent='';return;}
  const n=intersection.face.normal,p=intersection.point.clone().addScaledVector(n,-.005);hit={x:Math.floor(p.x),y:Math.floor(p.y),z:Math.floor(p.z),normal:n};hit.id=world.get(hit.x,hit.y,hit.z,dimension);
  outline.visible=true;outline.position.set(hit.x+.5,hit.y+.5,hit.z+.5);$('target').textContent=BLOCKS[hit.id]?.name||'';
}
function mine(dt){
  if(!mining||!hit||!active||inventory.open){mineTime=0;mineTarget='';$('mining').hidden=true;return;}
  const key=`${hit.x}:${hit.y}:${hit.z}`;if(key!==mineTarget){mineTime=0;mineTarget=key;}
  const required=requiredTool(hit.id),level=mode==='creative'?4:toolLevel(bag);
  if(hit.id===21||hit.id===14||hit.id===17||level<required){$('target').textContent=hit.id===21?'Bedrock':level<required?`${BLOCKS[hit.id].name} · ${['Hands','Wooden','Stone','Iron','Diamond'][required]} pickaxe required`:BLOCKS[hit.id].name;return;}
  mineTime+=dt;const duration=mode==='creative'?.12:hit.id===10?1.5:required?Math.max(.22,.85-level*.13):.35;
  $('mining').hidden=false;$('mining').value=mineTime/duration;
  if(mineTime>=duration){const id=drop(hit.id);bag[id]=(bag[id]||0)+1;offerHotbarItem(id);world.set(hit.x,hit.y,hit.z,0,dimension);changed(hit.x,hit.z);renderHotbar();mineTime=0;}
}
function place(){
  if(!active||inventory.open||menu.open)return;const id=hotbar[selected];if(!id){toast('Empty slot');return;}if(mode!=='creative'&&!(bag[id]>0)){toast(`No ${ITEMS[id].name}`);return;}
  updateTarget();
  if(id==='netherPortal'||id==='endPortal'){
    const x=Math.floor(player.position.x-Math.sin(yaw)*5-2),z=Math.floor(player.position.z-Math.cos(yaw)*5-(id==='endPortal'?2:.5));
    if(Math.abs(x)>LIMIT-7||Math.abs(z)>LIMIT-7){toast('World boundary');return;}
    createPortal(id==='endPortal'?'end':dimension==='nether'?'overworld':'nether',x,z);if(mode!=='creative')bag[id]--;renderHotbar();toast('Portal opened');return;
  }
  if(!hit||!ITEMS[id]?.block)return;const x=hit.x+hit.normal.x,y=hit.y+hit.normal.y,z=hit.z+hit.normal.z;
  const p=player.position;if(Math.abs(x+.5-p.x)<.8&&Math.abs(z+.5-p.z)<.8&&Math.abs(y+.5-p.y)<1.35)return;
  if(world.set(x,y,z,Number(id),dimension)){if(mode!=='creative')bag[id]--;changed(x,z);renderHotbar();}
}

$('play').onclick=()=>{if(!started&&!stored){const chosen=Number($('seed').value)||291026;if(chosen!==seed){seed=chosen;world=new VoxelWorld(seed);meshes.forEach(disposeChunk);meshes.clear();colliders.forEach(b=>physics.removeBody(b));colliders.clear();collisionAnchor='';player.position.set(...world.landing(dimension));}}resume();};
$('new').onclick=reset;$('pause').onclick=pause;$('bag').onclick=openInventory;$('save').onclick=()=>saveWorld();
$('menu-save').onclick=()=>saveWorld();
$('close-bag').onclick=()=>{inventory.close();keys.clear();if(active)captureMouse();};
document.querySelectorAll('[data-mode]').forEach(button=>{button.onclick=()=>{document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b===button));};button.classList.toggle('selected',button.dataset.mode===mode);});
$('seed').value=seed;$('seed').disabled=!!stored;$('save-status').textContent=stored?'Saved world ready':'';
$('travel').onclick=enterPortal;
window.addEventListener('keydown',event=>{
  if(event.target.matches('input,select')||inventory.open){if(event.code==='Escape'||event.code==='KeyE'){event.preventDefault();inventory.close();if(active)captureMouse();}return;}
  if(menu.open)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(event.code))event.preventDefault();keys.add(event.code);
  if(event.code==='Space'&&!event.repeat)jumpBuffer=.18;
  if(event.code==='KeyE'){openInventory();return;}if(event.code==='KeyF')enterPortal();if(event.code==='Escape')pause();
  if(/^Digit[1-9]$/.test(event.code)){selected=Number(event.code.slice(-1))-1;renderHotbar();}
});
window.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>{if(active)pause();});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&active&&!inventory.open&&!menu.open)pause();});
document.addEventListener('mousemove',event=>{if(document.pointerLockElement===canvas&&active){yaw-=event.movementX*.0024;pitch=Math.max(-1.5,Math.min(1.5,pitch-event.movementY*.0024));}});
canvas.addEventListener('contextmenu',event=>event.preventDefault());
canvas.addEventListener('pointerdown',event=>{if(!active||inventory.open)return;if(event.pointerType==='touch'){touchLook={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);return;}if(!document.pointerLockElement&&!TOUCH)captureMouse();if(event.button===0)mining=true;if(event.button===2)place();});
canvas.addEventListener('pointermove',event=>{if(!touchLook||event.pointerId!==touchLook.id)return;yaw-=(event.clientX-touchLook.x)*.005;pitch=Math.max(-1.5,Math.min(1.5,pitch-(event.clientY-touchLook.y)*.005));touchLook.x=event.clientX;touchLook.y=event.clientY;});
window.addEventListener('pointerup',()=>{mining=false;touchLook=null;});window.addEventListener('pointercancel',()=>{mining=false;touchLook=null;keys.clear();});
canvas.addEventListener('wheel',event=>{event.preventDefault();selected=(selected+(event.deltaY>0?1:8))%9;renderHotbar();},{passive:false});
document.querySelectorAll('[data-move]').forEach(button=>{const code=({forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD'})[button.dataset.move];button.onpointerdown=event=>{event.preventDefault();button.setPointerCapture(event.pointerId);keys.add(code);};button.onpointerup=button.onpointercancel=()=>keys.delete(code);});
$('touch-mine').onpointerdown=event=>{event.preventDefault();$('touch-mine').setPointerCapture(event.pointerId);mining=true;};$('touch-mine').onpointerup=$('touch-mine').onpointercancel=()=>mining=false;
$('touch-place').onclick=place;$('touch-jump').onpointerdown=event=>{event.preventDefault();$('touch-jump').setPointerCapture(event.pointerId);keys.add('Space');jumpBuffer=.18;};$('touch-jump').onpointerup=$('touch-jump').onpointercancel=()=>keys.delete('Space');
$('touch-down').onpointerdown=event=>{event.preventDefault();$('touch-down').setPointerCapture(event.pointerId);keys.add('ShiftLeft');};$('touch-down').onpointerup=$('touch-down').onpointercancel=()=>keys.delete('ShiftLeft');
window.addEventListener('pagehide',()=>saveWorld(false));
inventory.addEventListener('cancel',()=>{keys.clear();});menu.addEventListener('cancel',event=>{event.preventDefault();if(started)resume();});
window.addEventListener('resize',resize);function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);}resize();

function frame(now){
  requestAnimationFrame(frame);const dt=Math.min((now-last)/1000||.016,.05);last=now;
  if(queue.length){const [x,z]=queue.shift();buildChunk(x,z);}
  if(active&&!inventory.open&&!menu.open){
    const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
    const strafe=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    const speed=mode==='creative'?10:keys.has('ShiftLeft')?9:5.5,length=Math.hypot(forward,strafe)||1;
    player.velocity.x=(strafe*Math.cos(yaw)-forward*Math.sin(yaw))*speed/length;player.velocity.z=(-strafe*Math.sin(yaw)-forward*Math.cos(yaw))*speed/length;
    physics.gravity.y=mode==='creative'?0:-24;if(mode==='creative')player.velocity.y=(Number(keys.has('Space'))-Number(keys.has('ShiftLeft')))*8;
    updateColliders();groundGrace=grounded() ? .1 : Math.max(0,groundGrace-dt);jumpBuffer=Math.max(0,jumpBuffer-dt);
    if(mode!=='creative'&&jumpBuffer>0&&groundGrace>0&&player.velocity.y<=.5){player.velocity.y=8.5;jumpBuffer=0;groundGrace=0;}
    const oldY=player.velocity.y;physics.step(1/60,dt,4);
    player.position.x=Math.max(-LIMIT+1,Math.min(LIMIT-1,player.position.x));player.position.z=Math.max(-LIMIT+1,Math.min(LIMIT-1,player.position.z));
    if(mode!=='creative'&&oldY<-14&&player.velocity.y>-1)health=Math.max(0,health-Math.floor((-oldY-12)/2));
    damageTimer+=dt;if(mode!=='creative'&&damageTimer>1){damageTimer=0;const id=world.get(Math.floor(player.position.x),Math.floor(player.position.y-.7),Math.floor(player.position.z),dimension);health=id===17?health-4:Math.min(20,health+.2);}
    if(player.position.y<-12||health<=0){health=20;player.position.set(...world.landing(dimension));player.velocity.setZero();collisionAnchor='';toast('Returned to spawn');}
    updateChunks();if(now-lastSave>10000){saveWorld(false);lastSave=now;}
  }
  camera.position.set(player.position.x,player.position.y+.65,player.position.z);camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld();
  cloudGroup.position.set(player.position.x+Math.sin(now*.00001)*5,0,player.position.z);sun.position.set(player.position.x-60,65,player.position.z-75);stars.position.copy(camera.position);
  portalMeshes.forEach((g,i)=>{g.children[0].material.opacity=.6+Math.sin(now*.002+i)*.15;});
  updateTarget();mine(dt);
  nearestPortal=null;let distance=8;for(const p of portals.filter(p=>p.dimension===dimension)){const isEnd=p.target==='end';const d=Math.hypot(player.position.x-(p.x+(isEnd?2.5:2)),player.position.y-(p.y+(isEnd?1:2.5)),player.position.z-(p.z+(isEnd?2.5:.5)));if(d<distance){distance=d;nearestPortal=p;}}
  $('travel').hidden=!nearestPortal||!active||inventory.open||menu.open;$('travel').textContent=`Enter ${nearestPortal?({nether:'Nether',end:'End',overworld:'Overworld'})[nearestPortal.target]: 'portal'}`;
  $('coords').textContent=`${Math.floor(player.position.x)} / ${Math.floor(player.position.y)} / ${Math.floor(player.position.z)}`;
  $('health').textContent=mode==='creative'?'':`${'♥'.repeat(Math.ceil(health/2))}${'♡'.repeat(10-Math.ceil(health/2))}`;
  if(now>toastUntil)$('toast').classList.remove('visible');renderer.render(scene,camera);
}
setAtmosphere();refreshPortals();renderHotbar();updateChunks(true);menu.showModal();requestAnimationFrame(frame);
