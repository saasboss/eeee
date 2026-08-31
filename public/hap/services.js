/* Hap — domain service boundary.

   Screens ask this layer for entities instead of reaching into the state blob.
   Every read answers with the same envelope, so loading, empty, denied and
   error stop being invented per screen:

     { status: 'ok' | 'loading' | 'empty' | 'denied' | 'error', data, error }

   Today the implementation is a mock backed by the in-memory prototype state
   (persisted through data.js). Replacing it with a real API later means
   rewriting this file only — no renderer or action handler changes.

   Entities: Restaurant, Menu, Category, Item, ItemVariant, Promotion,
   Settings, Currency, Team, Activity, Insight, Subscription.
*/
(() => {
'use strict';

const ok      = data => ({status:'ok', data, error:null});
const empty   = data => ({status:'empty', data, error:null});
const denied  = key  => ({status:'denied', data:null, error:{code:'denied', key}});
const failed  = e    => ({status:'error', data:null, error:{code:'error', message:String(e&&e.message||e)}});
const loading = ()   => ({status:'loading', data:null, error:null});

/* A list read is 'empty' rather than 'ok' when it has nothing in it, so a
   screen can render its empty state without counting entries itself. */
const list = arr => (Array.isArray(arr)&&arr.length ? ok(arr) : empty(arr||[]));

function create(deps){
 const S = () => deps.getState();
 const allow = key => (!key || !deps.canAccess || deps.canAccess(key));
 /* Guarded read: permission is resolved here, never re-checked per screen. */
 const read = (key, fn) => {
  if(!allow(key)) return denied(key);
  try{ return fn(); }catch(e){ return failed(e); }
 };
 const write = (key, fn) => {
  if(!allow(key)) return denied(key);
  try{ const data = fn(); if(deps.save) deps.save(); return ok(data===undefined?null:data); }
  catch(e){ return failed(e); }
 };

 const menusOf = () => S().menus||[];
 const activeMenu = () => menusOf().find(m=>m.id===S().activeMenuId)||menusOf()[0]||null;
 const categoriesOf = () => (activeMenu()&&activeMenu().categories)||[];
 const itemsOf = () => categoriesOf().flatMap(c=>c.items||[]);

 return {
  /* Envelope helpers, exported so callers can build the same shapes. */
  ok, empty, denied, failed, loading, list,

  restaurant: {
   current: () => read(null, () => ok(S().restaurant)),
   update: patch => write(null, () => Object.assign(S().restaurant, patch))
  },

  menus: {
   list: () => read('menu', () => list(menusOf())),
   active: () => read('menu', () => { const m=activeMenu(); return m?ok(m):empty(null); }),
   select: id => write('menu', () => { S().activeMenuId=id; return id; })
  },

  categories: {
   list: () => read('menu', () => list(categoriesOf())),
   get: id => read('menu', () => { const c=categoriesOf().find(x=>x.id===id); return c?ok(c):empty(null); })
  },

  items: {
   list: () => read('menu', () => list(itemsOf())),
   visible: () => read('menu', () => list(itemsOf().filter(i=>i.status!=='hidden'))),
   get: id => read('menu', () => { const i=itemsOf().find(x=>x.id===id); return i?ok(i):empty(null); })
  },

  variants: {
   list: itemId => read('menu', () => {
    const i=itemsOf().find(x=>x.id===itemId);
    return list((i&&i.variants)||[]);
   })
  },

  /* Promotions have a lifecycle. The status function is injected so the
     renderer and this boundary can never disagree about what is live. */
  promotions: (() => {
   const statusOf = p => (deps.promoStatus ? deps.promoStatus(p) : (p&&p.active?'active':'none'));
   const isLive = p => statusOf(p)==='active';
   const all = () => {
    const out=[];
    for(const c of categoriesOf()){
     if(statusOf(c.promotion)!=='none') out.push({kind:'category',id:c.id,name:c.name,target:c,promotion:c.promotion,status:statusOf(c.promotion)});
     for(const i of (c.items||[])) if(statusOf(i.promotion)!=='none') out.push({kind:'item',id:i.id,name:i.name,target:i,promotion:i.promotion,status:statusOf(i.promotion)});
    }
    return out;
   };
   const find = (kind,id) => all().find(r=>r.kind===kind&&r.id===id)
    || (kind==='category'
     ? (c=>c?{kind,id,name:c.name,target:c,promotion:c.promotion,status:'none'}:null)(categoriesOf().find(c=>c.id===id))
     : (i=>i?{kind,id,name:i.name,target:i,promotion:i.promotion,status:'none'}:null)(itemsOf().find(i=>i.id===id)));
   const segment = s => s==='paused'?'active':s;
   return {
    all: () => read('promotions', () => list(all())),
    list: () => read('promotions', () => list(itemsOf().filter(i=>isLive(i.promotion)))),
    categories: () => read('promotions', () => list(categoriesOf().filter(c=>isLive(c.promotion)))),
    inSegment: seg => read('promotions', () => list(all().filter(r=>segment(r.status)===seg))),
    featured: () => read('promotions', () => {
     const i=itemsOf().find(x=>isLive(x.promotion));
     return i?ok(i):empty(null);
    }),
    save: (kind,id,promotion) => write('promotions', () => {
     const row=find(kind,id);
     if(!row) throw new Error('Unknown promotion target');
     row.target.promotion={...promotion,active:true,pausedAt:null,endedAt:null};
     return row.target.promotion;
    }),
    pause: (kind,id) => write('promotions', () => {
     const row=find(kind,id);
     if(!row||!row.promotion) throw new Error('Unknown promotion target');
     row.promotion.pausedAt=Date.now();
     return row.promotion;
    }),
    resume: (kind,id) => write('promotions', () => {
     const row=find(kind,id);
     if(!row||!row.promotion) throw new Error('Unknown promotion target');
     row.promotion.pausedAt=null;
     return row.promotion;
    }),
    end: (kind,id) => write('promotions', () => {
     const row=find(kind,id);
     if(!row||!row.promotion) throw new Error('Unknown promotion target');
     row.promotion.active=false;
     row.promotion.pausedAt=null;
     row.promotion.endedAt=Date.now();
     return row.promotion;
    })
   };
  })(),


  settings: {
   get: () => read(null, () => ok({
    restaurant:S().restaurant, appearance:S().appearance, qrStyle:S().qrStyle
   }))
  },

  currency: {
   get: () => read(null, () => ok((S().restaurant&&S().restaurant.currency)||null)),
   rates: () => read(null, () => list(((S().restaurant||{}).currency||{}).rates||[]))
  },

  team: {
   list: () => read('staff', () => list(((S().ops||{}).staff)||[]))
  },

  activity: {
   list: () => read(null, () => list(((S().ops||{}).activity)||[]))
  },

  /* Insights only ever report events that were actually recorded. The
     taxonomy is closed: anything outside it is dropped rather than guessed
     at, and there is no derived revenue or conversion anywhere. */
  insights: (() => {
   const TYPES=['menu_open','item_view','category_expand','language_change','search','filter_allergen','filter_diet'];
   const SPANS={'24h':1,'7d':7,'30d':30};
   const all = () => (((S().analytics||{}).events)||[]).filter(e=>e&&TYPES.includes(e.type));
   const within = range => {
    const events=all();
    if(range==='all'||!range) return events;
    const cutoff=Date.now()-(SPANS[range]||7)*86400000;
    return events.filter(e=>e.at>=cutoff);
   };
   const tally = (arr,key) => {
    const counts={};
    for(const e of arr){ const k=e[key]; if(k===undefined||k===null||k==='') continue; counts[k]=(counts[k]||0)+1; }
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]);
   };
   return {
    types: () => TYPES.slice(),
    events: range => read(null, () => list(within(range))),
    summary: range => read(null, () => {
     const events=within(range);
     const of = type => events.filter(e=>e.type===type);
     const payload={
      events,
      opens: of('menu_open').length,
      itemViews: of('item_view').length,
      categoryExpands: of('category_expand').length,
      languageChanges: of('language_change').length,
      searches: of('search').length,
      topItems: tally(of('item_view'),'id').slice(0,5),
      topSearches: tally(of('search'),'q').slice(0,5),
      languages: tally(of('menu_open'),'lang'),
      allergenFilters: tally(of('filter_allergen'),'code'),
      dietFilters: tally(of('filter_diet'),'diet')
     };
     return events.length?ok(payload):empty(payload);
    }),
    clear: () => write(null, () => { const a=S().analytics||(S().analytics={events:[]}); a.events=[]; a.seeded=false; return true; })
   };
  })(),


  subscription: {
   get: () => read('billing', () => ok((S().restaurant||{}).subscription||null)),
   invoices: () => read('billing', () => list(S().invoices||[]))
  }
 };
}

window.HapServices = {create, ok, empty, denied, failed, loading, list};
})();
