export const CREATIVE_HOTBAR=['2','3','5','12','13','10','22','netherPortal','endPortal'];

export function freshHotbar(mode){
  return mode==='creative'?[...CREATIVE_HOTBAR]:Array(9).fill(null);
}

export function ownedHotbar(slots,bag,mode){
  return Array.from({length:9},(_,i)=>{
    const id=slots[i];
    return id&&(mode==='creative'||bag[id]>0)?String(id):null;
  });
}

export function hasGroundContact(player,contacts){
  return contacts.some(contact=>contact.enabled!==false&&(
    contact.bi===player&&contact.ni.y<-.5||
    contact.bj===player&&contact.ni.y>.5
  ));
}
