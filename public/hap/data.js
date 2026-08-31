/* Hap — data/service boundary.
   Every read and write of persisted data goes through this module instead of
   touching localStorage directly. Today it is backed by a local mock driver;
   swapping in a real API later means replacing `driver` only — no screen,
   renderer, or action handler needs to change.

   Contract (all methods synchronous today, safe to make async later):
     restaurants.list()                -> [{slug}]
     restaurants.read(slug)            -> raw JSON string | null
     restaurants.write(slug, value)    -> void
     restaurants.remove(slug)          -> void
     restaurants.migrateLegacy(slug, legacyKey) -> raw JSON string | null
     guest.read()                      -> object
     guest.write(prefs)                -> void
*/
(() => {
'use strict';

const PREFIX = 'hap.restaurant.';
const SUFFIX = '.v1';
const GUEST_KEY = 'hap.guest.v1';
const keyFor = slug => `${PREFIX}${slug}${SUFFIX}`;

/* The mock driver. Isolated so the storage medium is an implementation
   detail of this file. */
const driver = {
 get(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } },
 set(key,value){ try{ localStorage.setItem(key,value); }catch(e){} },
 remove(key){ try{ localStorage.removeItem(key); }catch(e){} },
 keys(){ try{ return Object.keys(localStorage); }catch(e){ return []; } }
};

const restaurants = {
 list(){
  return driver.keys()
   .filter(k=>k.startsWith(PREFIX)&&k.endsWith(SUFFIX))
   .map(k=>({slug:k.slice(PREFIX.length,-SUFFIX.length)}))
   .filter(r=>r.slug);
 },
 read(slug){ return driver.get(keyFor(slug)); },
 write(slug,value){ driver.set(keyFor(slug),typeof value==='string'?value:JSON.stringify(value)); },
 remove(slug){ driver.remove(keyFor(slug)); },
 /* One-time carry-over of the pre-tenancy single-blob record. Returns the
    raw record it adopted, or null when there was nothing to adopt. */
 migrateLegacy(slug,legacyKey){
  if(driver.get(keyFor(slug))!==null) return null;
  const legacy = driver.get(legacyKey);
  if(legacy===null) return null;
  driver.set(keyFor(slug),legacy);
  driver.remove(legacyKey);
  return legacy;
 }
};

const guest = {
 read(){
  try{
   const parsed=JSON.parse(driver.get(GUEST_KEY));
   if(!parsed||typeof parsed!=='object') return {};
   return {
    language: typeof parsed.language==='string'?parsed.language:undefined,
    displayCurrency: typeof parsed.displayCurrency==='string'?parsed.displayCurrency:undefined
   };
  }catch(e){ return {}; }
 },
 write(prefs){
  driver.set(GUEST_KEY,JSON.stringify({
   language: prefs&&typeof prefs.language==='string'?prefs.language:undefined,
   displayCurrency: prefs&&typeof prefs.displayCurrency==='string'?prefs.displayCurrency:undefined
  }));
 }
};

window.HapData = { restaurants, guest };
})();
