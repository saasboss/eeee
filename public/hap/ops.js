/* Hap — SaaS operations module.
   Provides the SuperAdmin control centre and the restaurant Admin
   operational pages (staff). Rendered by app.js, which
   passes a context object with shared helpers. */
(() => {
'use strict';

/* Platform money is always Albanian Lek — routed through ctx.platformMoney.
   Restaurant menu money is formatted in that restaurant's own primary currency. */
function currencyOfRestaurant(ctx,id){
 if(id==='sofra') return ctx.currencyOf();
 const map=ctx.state.platform.currencies||{};
 return map[id]||{primary:'EUR',conversionsEnabled:false,rates:[]};
}
function rmoney(ctx,id,v){ return ctx.formatCurrency(v,currencyOfRestaurant(ctx,id).primary); }

/* The single Hap plan. One product, one price, billed in Lek. */
const HAP_PLAN={id:'hap',name:'Hap',price:2500,currency:'ALL',interval:'monthly',
 features:{menus:'Unlimited',languages:23,analytics:true,promotions:true,staff:'Unlimited'}};

const PERMISSION_KEYS=[['menu','Edit menu'],['prices','Change prices'],['promotions','Run promotions'],['design','Change design'],['billing','Billing'],['staff','Manage staff']];
const ROLE_PERMS={Owner:['menu','prices','promotions','design','billing','staff'],Manager:['menu','prices','promotions','design'],Server:['menu'],Kitchen:[]};
function permsFor(role){ const allowed=ROLE_PERMS[role]||[]; const o={}; PERMISSION_KEYS.forEach(([k])=>{ o[k]=allowed.includes(k); }); return o; }

function defaults(){
 return {
  ops:{
   actorId:'s1',
   staff:[
    {id:'s1',name:'Arben Kola',role:'Owner',email:'arben@sofra.al',status:'Active',last:'Today, 18:02',permissions:permsFor('Owner')},
    {id:'s2',name:'Elira Mema',role:'Manager',email:'elira@sofra.al',status:'Active',last:'Today, 17:40',permissions:permsFor('Manager')},
    {id:'s3',name:'Jon Dervishi',role:'Server',email:'jon@sofra.al',status:'Active',last:'Today, 16:55',permissions:permsFor('Server')},
    {id:'s4',name:'Sara Prifti',role:'Kitchen',email:'sara@sofra.al',status:'Suspended',last:'12 Aug, 21:10',permissions:permsFor('Kitchen')}
   ],
   activity:[
    {id:'a3',actorId:'s2',actorName:'Elira Mema',actorRole:'Manager',action:'Changed price',entityType:'item',entityName:'Grilled Sea Bass',from:'1,700 Lek',to:'1,750 Lek',at:new Date(Date.now()-3600000).toISOString()},
    {id:'a2',actorId:'s3',actorName:'Jon Dervishi',actorRole:'Server',action:'Marked sold out',entityType:'item',entityName:'Diavola',from:'available',to:'soldout',at:new Date(Date.now()-7200000).toISOString()},
    {id:'a1',actorId:'s1',actorName:'Arben Kola',actorRole:'Owner',action:'Published menu',entityType:'menu',entityName:'Sofra',from:null,to:null,at:new Date(Date.now()-86400000).toISOString()}
   ],
   notifications:{dailySummary:true,lowStock:false},
   hours:[['Monday','09:00 – 23:00'],['Tuesday','09:00 – 23:00'],['Wednesday','09:00 – 23:00'],['Thursday','09:00 – 23:00'],['Friday','09:00 – 00:30'],['Saturday','09:00 – 00:30'],['Sunday','10:00 – 22:00']]
  },
  platform:{
   metrics:{mrr:267500,mrrDelta:6.2,restaurants:126,activeUsers:412,churn:1.8,trials:19},
   plans:[{...HAP_PLAN,accounts:107}],
   users:[
    {id:'u1',name:'Arben Kola',email:'arben@sofra.al',role:'Owner',restaurant:'Sofra',status:'Active',last:'2 min ago'},
    {id:'u2',name:'Elira Mema',email:'elira@bellanapoli.al',role:'Owner',restaurant:'Bella Napoli',status:'Active',last:'14 min ago'},
    {id:'u3',name:'Jon Dervishi',email:'jon@marina.al',role:'Manager',restaurant:'Marina',status:'Active',last:'31 min ago'},
    {id:'u4',name:'Sara Prifti',email:'sara@kinema.al',role:'Owner',restaurant:'Kinema Bistro',status:'Invited',last:'Never'},
    {id:'u5',name:'Luan Berisha',email:'luan@garden21.al',role:'Owner',restaurant:'Garden 21',status:'Suspended',last:'3 days ago'},
    {id:'u6',name:'Mira Hoxha',email:'mira@hap.app',role:'Support',restaurant:'—',status:'Active',last:'1 h ago'}
   ],
   settings:{signupsOpen:true,trialDays:14,aiTranslations:true,
    languages:['English','Albanian','Italian','German','French'],
    emails:[
     {id:'welcome',name:'Welcome email',subject:'Your menu is ready to publish',status:'Live'},
     {id:'trial',name:'Trial ending',subject:'3 days left on your trial',status:'Live'},
     {id:'invoice',name:'Invoice receipt',subject:'Your Hap invoice',status:'Live'},
     {id:'winback',name:'Win-back',subject:'Come back to Hap',status:'Draft'}
    ]},
   currencies:{
    bella:{primary:'EUR',conversionsEnabled:true,rates:[{code:'ALL',rate:0.0102,source:'manual',updatedAt:'2026-08-01'}]},
    marina:{primary:'ALL',conversionsEnabled:true,rates:[{code:'EUR',rate:98,source:'manual',updatedAt:'2026-08-10'}]},
    kinema:{primary:'ALL',conversionsEnabled:false,rates:[]},
    garden:{primary:'EUR',conversionsEnabled:false,rates:[]}
   },
   menus:{
    bella:[{id:'pizza',name:'Pizza',items:[{id:'bn1',name:'Marinara',price:7.5,status:'available'},{id:'bn2',name:'Quattro Formaggi',price:11,status:'available'}]},
           {id:'dolci',name:'Dolci',items:[{id:'bn3',name:'Cannoli',price:5,status:'soldout'}]}],
    marina:[{id:'fish',name:'Fish',items:[{id:'mr1',name:'Sea bream',price:1600,status:'available'},{id:'mr2',name:'Mussels',price:1200,status:'available'}]}],
    kinema:[{id:'small',name:'Small plates',items:[{id:'kb1',name:'Olives & feta',price:400,status:'available'}]}],
    garden:[{id:'grill',name:'Grill',items:[{id:'g1',name:'Lamb chops',price:15,status:'available'}]}]
   }
  }
 };
}


/* ---------------- shared bits ---------------- */
function kpi(label,value,delta,tone){
 return `<div class="card kpi"><span>${label}</span><strong>${value}</strong>${delta?`<em class="stat-delta ${tone||''}">${delta}</em>`:''}</div>`;
}
function tableRow(cells,attrs=''){ return `<button class="data-row" ${attrs}>${cells}</button>`; }
function pill(text,tone){ return `<span class="status-pill tone-${tone}">${text}</span>`; }
function toneFor(status){
 const s=String(status).toLowerCase();
 if(['live','active','available','free','served','paid'].includes(s)) return 'ok';
 if(['draft','invited','reserved','preparing','new'].includes(s)) return 'warn';
 if(['suspended','soldout','sold out','past due','churned'].includes(s)) return 'bad';
 return 'neutral';
}
function emptyState(ctx,title,body,label,action,data=''){
 return `<div class="card empty-state"><div class="empty-orb">${ctx.icon('spark',18)}</div><strong>${title}</strong><p>${body}</p><button class="btn primary" data-action="${action}" ${data}>${label}</button></div>`;
}


/* ---------------- subscriptions ---------------- */
/* Every legacy tier id collapses to the single Hap plan. */
const PLAN_LABELS={hap:'Hap',starter:'Hap',growth:'Hap',scale:'Hap'};
const GRANT_DURATIONS=[['7d','7 days',7],['1m','1 month',30],['3m','3 months',90],['6m','6 months',180],['1y','1 year',365],['lifetime','Lifetime',null]];
function fmtDay(iso){ if(!iso) return 'No end date'; const d=new Date(iso); return isNaN(d)?iso:d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}); }
function subOf(r){
 if(!r.subscription) r.subscription={status:'trial',accessSource:'trial',plan:'hap',startedAt:new Date().toISOString().slice(0,10),endsAt:null,billingInterval:null,grant:null};
 return r.subscription;
}
function sourceLabel(sub){
 if(sub.accessSource==='manual') return 'Manual grant';
 if(sub.accessSource==='trial') return 'Trial';
 return sub.billingInterval==='yearly' ? 'Paid · yearly' : 'Paid · monthly';
}
/* paid / trial / manual-grant split across the whole platform. */
function accessBreakdown(ctx){
 const list=ctx.state.superadmin.restaurants||[];
 const count=src=>list.filter(r=>subOf(r).accessSource===src).length;
 return [['Paid',count('billing')],['Trial',count('trial')],['Manual grant',count('manual')]];
}
function subscriptionSection(ctx,r){
 const sub=subOf(r);
 return `<section class="section"><div class="section-row"><div class="section-title">Subscription</div>${pill(sub.status,toneFor(sub.status==='active'?'active':sub.status==='trial'?'invited':'churned'))}</div>
  <div class="card list-card">
   <div class="system-row"><strong>Plan</strong><span>${PLAN_LABELS[sub.plan]||'Hap'} · ${ctx.platformMoney(HAP_PLAN.price)}/mo</span></div>
   <div class="system-row"><strong>Access source</strong><span>${sourceLabel(sub)}</span></div>
   <div class="system-row"><strong>Started</strong><span>${fmtDay(sub.startedAt)}</span></div>
   <div class="system-row"><strong>Expires</strong><span>${sub.endsAt?fmtDay(sub.endsAt):'Lifetime'}</span></div>
   ${sub.grant?`<div class="system-row"><strong>Granted by</strong><span>${ctx.escapeHtml(sub.grant.grantedBy)} · ${ctx.escapeHtml(sub.grant.reason||'—')}</span></div>`:''}
  </div>
  <div class="section-row" style="margin-top:12px"><div class="section-title">Grant access</div></div>
  <div class="filter-row">${GRANT_DURATIONS.map(([id,label])=>`<button class="filter-chip" data-action="grant-access" data-id="${r.id}" data-duration="${id}">${label}</button>`).join('')}</div>
 </section>`;
}


/* ---------------- SuperAdmin ---------------- */
function superHead(ctx,title,sub,actionHtml=''){
 return `<div class="page-head"><div><div class="eyebrow super-brand">Hap control</div><h1 class="page-title">${title}</h1><p class="page-subtitle">${sub}</p></div>${actionHtml}</div>`;
}

function overview(ctx){
 const list=ctx.state.superadmin.restaurants||[];
 const paid=list.filter(r=>subOf(r).accessSource==='billing').length;
 const trial=list.filter(r=>subOf(r).accessSource==='trial').length;
 const manual=list.filter(r=>subOf(r).accessSource==='manual').length;
 const suspended=list.filter(r=>r.status==='Suspended').length;
 const activeUsers=(ctx.state.platform.users||[]).filter(u=>u.status==='Active').length;
 const mrr=HAP_PLAN.price*paid;
 const breakdown=accessBreakdown(ctx);
 const total=breakdown.reduce((s,[,n])=>s+n,0)||1;
 const churnPct=list.length?Math.round(suspended/list.length*10)/10:0;
 return `${superHead(ctx,'Overview','Live health of the Hap platform.')}
 <div class="kpi-grid">
  ${kpi('MRR',ctx.platformMoney(mrr),`${paid} paying accounts`,'up')}
  ${kpi('Restaurants',list.length,`${trial} on trial`,'')}
  ${kpi('Active users',activeUsers,'platform accounts','')}
  ${kpi('Suspended',`${suspended}`,`${churnPct}% of accounts`,suspended?'bad':'ok')}
 </div>
 <section class="section"><div class="section-row"><div class="section-title">How access is held</div><button class="section-link" data-action="super-tab" data-tab="plans">Plan and billing</button></div>
  <div class="card bar-list">${breakdown.map(([name,n])=>`<div class="bar-row"><div class="bar-label"><span>${name}</span><span>${n} ${n===1?'restaurant':'restaurants'}</span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(n/total*100)}%"></div></div></div>`).join('')}</div>
 </section>
 <section class="section"><div class="section-row"><div class="section-title">Recent restaurants</div><button class="section-link" data-action="super-tab" data-tab="restaurants">See all</button></div>
  <div class="card list-card">${list.slice(0,4).map(r=>restaurantRow(ctx,r)).join('')}</div>
 </section>
 <section class="section"><div class="section-row"><div class="section-title">Platform health</div></div>
  <div class="card list-card">${[['Public menus','Operational'],['API latency','132 ms · demo value'],['Translation queue','3 waiting · demo value']].map(([n,v])=>`<div class="system-row"><i class="system-dot"></i><strong>${n}</strong><span>${v}</span></div>`).join('')}</div>
 </section>`;
}

function restaurantRow(ctx,r){
 return tableRow(`<div class="restaurant-avatar">${ctx.escapeHtml(r.name[0])}</div>
  <div class="data-copy"><strong>${ctx.escapeHtml(r.name)}</strong><span>${ctx.escapeHtml(r.owner)} · ${sourceLabel(subOf(r))} · ${ctx.escapeHtml(r.created||'—')}</span></div>

  ${pill(ctx.escapeHtml(r.status),toneFor(r.status))}${ctx.icon('chevron',16)}`,
 `data-action="super-subpage" data-page="restaurant" data-id="${r.id}"`);
}

function restaurants(ctx){
 const q=(ctx.ui.superSearch||'').toLowerCase();
 const filter=ctx.ui.superFilter||'all';
 const list=ctx.state.superadmin.restaurants.filter(r=>(r.name+' '+r.owner+' '+r.status).toLowerCase().includes(q))
  .filter(r=>filter==='all'||r.status.toLowerCase()===filter);
 return `${superHead(ctx,'Restaurants','Every account on the platform.')}
 <label class="search-field">${ctx.icon('search',17)}<input id="super-search" value="${ctx.escapeHtml(ctx.ui.superSearch||'')}" placeholder="Search restaurants" aria-label="Search restaurants"></label>
 <div class="filter-row">${[['all','All'],['live','Live'],['draft','Draft'],['suspended','Suspended']].map(([id,n])=>`<button class="filter-chip ${filter===id?'active':''}" data-action="super-filter" data-filter="${id}">${n}</button>`).join('')}</div>
 <div class="card list-card">${list.map(r=>restaurantRow(ctx,r)).join('')||`<div class="empty-inline">No restaurants match that search. <button class="link-btn" data-action="super-filter" data-filter="all">Clear filters</button></div>`}</div>`;
}

function currencySection(ctx,r){
 const cur=currencyOfRestaurant(ctx,r.id);
 const rates=(cur.rates||[]).filter(x=>Number(x.rate)>0);
 const updated=rates.map(x=>x.updatedAt).filter(Boolean).sort().pop();
 return `<section class="section"><div class="section-row"><div><div class="section-title">Menu currency</div><div class="page-subtitle">Read-only — the restaurant owns this setting.</div></div></div>
  <div class="card list-card">
   <div class="system-row"><strong>Primary currency</strong><span>${ctx.escapeHtml(cur.primary)} · ${ctx.escapeHtml((ctx.CURRENCIES[cur.primary]||{}).name||'')}</span></div>
   <div class="system-row"><strong>Guest conversions</strong><span>${cur.conversionsEnabled&&rates.length?`${rates.length} enabled`:'Off'}</span></div>
   ${cur.conversionsEnabled?rates.map(x=>`<div class="system-row"><strong>1 ${ctx.escapeHtml(x.code)}</strong><span>= ${ctx.escapeHtml(String(x.rate))} ${ctx.escapeHtml(cur.primary)}</span></div>`).join(''):''}
   <div class="system-row"><strong>Rates updated</strong><span>${updated?fmtDay(updated):'Never'}</span></div>
  </div>
 </section>`;
}

function restaurantDetail(ctx){
 const r=ctx.state.superadmin.restaurants.find(x=>x.id===ctx.ui.subId);
 if(!r) return backHead(ctx,'Restaurant')+`<div class="card empty-inline">This restaurant no longer exists.</div>`;
 return `${backHead(ctx,r.name,'Account')}
 <div class="kpi-grid">
  ${kpi('Plan',HAP_PLAN.name,ctx.platformMoney(HAP_PLAN.price)+'/mo','')}
  ${kpi('Status',r.status,r.created,'')}
  ${kpi('Menu views',r.views,'last 30 days','')}
  ${kpi('Languages',r.languages,'published','')}
 </div>
 <section class="section"><div class="section-row"><div class="section-title">Profile</div></div>
  <div class="card form-card">
   <div class="field"><label for="ra-name">Restaurant name</label><input id="ra-name" data-ops-field="name" value="${ctx.escapeHtml(r.name)}"></div>
   <div class="field"><label for="ra-owner">Owner</label><input id="ra-owner" data-ops-field="owner" value="${ctx.escapeHtml(r.owner)}"></div>
   <div class="field"><label for="ra-status">Status</label><select id="ra-status" data-ops-field="status">${['Live','Draft','Suspended'].map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
   <button class="btn primary full" data-action="save-restaurant" data-id="${r.id}">Save changes</button>
  </div>
 </section>
 ${subscriptionSection(ctx,r)}
 ${currencySection(ctx,r)}
 <section class="section"><div class="section-row"><div class="section-title">Menu</div></div>
  <button class="card settings-row" data-action="super-subpage" data-page="menu" data-id="${r.id}"><div class="settings-icon">${ctx.icon('menu',18)}</div><div class="settings-copy"><strong>Open menu editor</strong><span>Categories, dishes and availability</span></div>${ctx.icon('chevron',17)}</button>
 </section>
 <button class="btn danger full" data-action="suspend-restaurant" data-id="${r.id}">${r.status==='Suspended'?'Restore account':'Suspend account'}</button>`;
}


function opsMenuOf(ctx,id){
 if(id==='sofra') return ctx.state.categories;
 ctx.state.platform.menus[id]=ctx.state.platform.menus[id]||[];
 return ctx.state.platform.menus[id];
}
function restaurantMenu(ctx){
 const id=ctx.ui.subId;
 const r=ctx.state.superadmin.restaurants.find(x=>x.id===id);
 const cats=opsMenuOf(ctx,id);
 return `${backHead(ctx,`${r?r.name:'Menu'} menu`,'Menu editor')}
 <div class="admin-toolbar"><button class="btn primary" data-action="ops-add-category" data-rid="${id}">${ctx.icon('plus',15)} Add category</button></div>
 ${cats.length?cats.map(c=>`<div class="card category-admin">
   <div class="category-head static"><div class="category-copy"><strong>${ctx.escapeHtml(c.name)}</strong><span>${c.items.length} ${c.items.length===1?'dish':'dishes'}</span></div>
    <button class="mini-icon" data-action="ops-delete-category" data-rid="${id}" data-cid="${c.id}" aria-label="Delete ${ctx.escapeHtml(c.name)}">${ctx.icon('trash',15)}</button></div>
   <div class="category-body">
     ${c.items.map(i=>`<div class="admin-item compact"><div class="admin-item-copy"><strong>${ctx.escapeHtml(i.name)}</strong><span><i class="status-dot ${i.status}"></i>${i.status==='soldout'?'Sold out':'Available'} · ${rmoney(ctx,id,i.price)}</span></div>
     <div class="item-menu-actions"><button class="item-action" data-action="ops-edit-item" data-rid="${id}" data-cid="${c.id}" data-iid="${i.id}">Edit</button><button class="item-action" data-action="ops-delete-item" data-rid="${id}" data-cid="${c.id}" data-iid="${i.id}">Delete</button></div></div>`).join('')
     ||`<div class="empty-inline">No dishes yet.</div>`}
    <button class="btn small soft" data-action="ops-add-item" data-rid="${id}" data-cid="${c.id}">${ctx.icon('plus',13)} Add dish</button>
   </div></div>`).join('')
 :emptyState(ctx,'No categories yet','Start with a category like Starters, then add dishes to it.','Add category','ops-add-category',`data-rid="${id}"`)}`;
}

function users(ctx){
 const q=(ctx.ui.userSearch||'').toLowerCase();
 const filter=ctx.ui.userFilter||'all';
 const list=ctx.state.platform.users.filter(u=>(u.name+' '+u.email+' '+u.restaurant).toLowerCase().includes(q))
  .filter(u=>filter==='all'||u.status.toLowerCase()===filter);
 return `${superHead(ctx,'Users','Roles, access and account status.')}
 <label class="search-field">${ctx.icon('search',17)}<input id="user-search" value="${ctx.escapeHtml(ctx.ui.userSearch||'')}" placeholder="Search users" aria-label="Search users"></label>
 <div class="filter-row">${[['all','All'],['active','Active'],['invited','Invited'],['suspended','Suspended']].map(([id,n])=>`<button class="filter-chip ${filter===id?'active':''}" data-action="user-filter" data-filter="${id}">${n}</button>`).join('')}</div>
 <div class="card list-card">${list.map(u=>tableRow(`<div class="restaurant-avatar">${ctx.escapeHtml(u.name[0])}</div><div class="data-copy"><strong>${ctx.escapeHtml(u.name)}</strong><span>${ctx.escapeHtml(u.role)} · ${ctx.escapeHtml(u.restaurant)} · ${ctx.escapeHtml(u.last)}</span></div>${pill(u.status,toneFor(u.status))}${ctx.icon('chevron',16)}`,`data-action="open-sheet" data-sheet="opsUser" data-id="${u.id}"`)).join('')
  ||`<div class="empty-inline">No users match that search. <button class="link-btn" data-action="user-filter" data-filter="all">Clear filters</button></div>`}</div>`;
}

function plans(ctx){
 const p=ctx.state.platform.plans[0]||{...HAP_PLAN,accounts:0};
 const list=ctx.state.superadmin.restaurants||[];
 const paid=list.filter(r=>subOf(r).accessSource==='billing').length;
 const trial=list.filter(r=>subOf(r).accessSource==='trial').length;
 const manual=list.filter(r=>subOf(r).accessSource==='manual').length;
 const mrr=p.price*p.accounts;
 return `${superHead(ctx,'Plan and billing','One plan, one price, billed in Albanian Lek.')}
 <div class="kpi-grid">${kpi('Total MRR',ctx.platformMoney(mrr),`${p.accounts} paying accounts`,'up')}${kpi('Price',ctx.platformMoney(p.price),'per restaurant / month','')}</div>
 <div class="card plan-card">
  <div class="plan-top"><div><strong>${p.name}</strong><span>${p.accounts} accounts · ${ctx.platformMoney(mrr)}/mo</span></div><div class="plan-price">${ctx.platformMoney(p.price)}<em>/mo</em></div></div>
  <div class="feature-list">
   ${[['analytics','Analytics'],['promotions','Promotions']].map(([k,label])=>`<div class="feature-row"><span>${label}</span><button class="switch ${p.features[k]?'on':''}" role="switch" aria-checked="${!!p.features[k]}" aria-label="${label} on ${p.name}" data-action="toggle-plan-feature" data-plan="${p.id}" data-key="${k}"><i></i></button></div>`).join('')}
   <div class="feature-row"><span>Menus</span><strong>${p.features.menus}</strong></div>
   <div class="feature-row"><span>Languages</span><strong>${p.features.languages}</strong></div>
   <div class="feature-row"><span>Staff seats</span><strong>${p.features.staff}</strong></div>
  </div>
  <button class="btn soft full" data-action="open-sheet" data-sheet="opsPlan" data-id="${p.id}">Edit plan</button>
 </div>
 <section class="section"><div class="section-row"><div class="section-title">Access across restaurants</div></div>
  <div class="card list-card">
   ${[['Paid subscriptions',paid],['On trial',trial],['Manual grants',manual]].map(([n,v])=>`<div class="system-row"><strong>${n}</strong><span>${v}</span></div>`).join('')}
  </div>
 </section>
 <section class="section"><div class="section-row"><div class="section-title">Restaurants</div><button class="section-link" data-action="super-tab" data-tab="restaurants">See all</button></div>
  <div class="card list-card">${list.map(r=>restaurantRow(ctx,r)).join('')}</div>
 </section>`;
}

function superSettings(ctx){
 const s=ctx.state.platform.settings;
 return `${superHead(ctx,'Settings','Global configuration for every workspace.')}
 <section class="section"><div class="section-row"><div class="section-title">Feature toggles</div></div><div class="settings-list">
  ${[['signupsOpen','Open sign-ups','New restaurants can register'],['aiTranslations','AI translations','Auto-translate new dishes']].map(([k,t,sub])=>`
   <div class="card settings-row"><div class="settings-copy"><strong>${t}</strong><span>${sub}</span></div><button class="switch ${s[k]?'on':''}" role="switch" aria-checked="${!!s[k]}" aria-label="${t}" data-action="toggle-platform" data-key="${k}"><i></i></button></div>`).join('')}
 </div></section>

 <section class="section"><div class="section-row"><div class="section-title">Trial length</div></div>
  <div class="card form-card"><div class="field"><label for="trial-days">Days of free trial</label><input id="trial-days" type="number" min="0" max="60" value="${s.trialDays}" data-ops-field="trialDays"></div><button class="btn primary full" data-action="save-platform-settings">Save changes</button></div>
 </section>
 <section class="section"><div class="section-row"><div class="section-title">Email templates</div></div>
  <div class="card list-card">${s.emails.map(e=>tableRow(`<div class="data-copy"><strong>${e.name}</strong><span>${ctx.escapeHtml(e.subject)}</span></div>${pill(e.status,e.status==='Live'?'ok':'warn')}${ctx.icon('chevron',16)}`,`data-action="open-sheet" data-sheet="opsEmail" data-id="${e.id}"`)).join('')}</div>
 </section>
 <section class="section"><div class="section-row"><div class="section-title">Supported languages</div><button class="section-link" data-action="open-sheet" data-sheet="opsLanguages">Manage</button></div>
  <div class="card"><div class="chip-wrap">${s.languages.map(l=>`<span class="soft-chip">${ctx.escapeHtml(l)}</span>`).join('')}</div></div>
 </section>`;
}

/* ---------------- Restaurant admin ops pages ---------------- */
function backHead(ctx,title,eyebrow=''){
 return `<div class="back-row"><button data-action="subpage-back" aria-label="Go back">${ctx.icon('back',18)}</button><div><div class="eyebrow">${ctx.escapeHtml(eyebrow)}</div><strong>${ctx.escapeHtml(title)}</strong></div></div>`;
}

function staff(ctx){
 const list=ctx.state.ops.staff;
 return `<div class="page-head"><div><div class="eyebrow">Team</div><h1 class="page-title">Staff</h1><p class="page-subtitle">${list.filter(s=>s.status==='Active').length} active of ${list.length}</p></div><button class="icon-btn" data-action="open-sheet" data-sheet="opsStaff" aria-label="Invite team member">${ctx.icon('plus',20)}</button></div>
 ${list.length?`<div class="card list-card">${list.map(s=>tableRow(`<div class="restaurant-avatar">${ctx.escapeHtml(s.name[0])}</div><div class="data-copy"><strong>${ctx.escapeHtml(s.name)}</strong><span>${ctx.escapeHtml(s.role)} · ${ctx.escapeHtml(s.last)}</span></div>${pill(s.status,toneFor(s.status))}${ctx.icon('chevron',16)}`,`data-action="open-sheet" data-sheet="opsStaff" data-id="${s.id}"`)).join('')}</div>`
 :emptyState(ctx,'No team members yet','Invite your manager or servers so they can update the menu during service.','Invite team member','open-sheet','data-sheet="opsStaff"')}`;
}

function adminSettings(ctx){
 const r=ctx.state.restaurant, o=ctx.state.ops;
 return `${backHead(ctx,'Restaurant settings','Profile and service')}
 <section class="section"><div class="section-row"><div class="section-title">Profile</div></div>
 <div class="card form-card">
  <div class="field"><label for="set-name">Restaurant name</label><input id="set-name" data-setting="name" value="${ctx.escapeHtml(r.name)}"></div>
  <div class="field"><label for="set-city">City</label><input id="set-city" data-setting="city" value="${ctx.escapeHtml(r.city)}"></div>
  <div class="field"><label for="set-phone">Phone</label><input id="set-phone" data-setting="phone" value="${ctx.escapeHtml(r.phone)}"></div>
  <div class="field"><label for="set-address">Address</label><input id="set-address" data-setting="address" value="${ctx.escapeHtml(r.address)}"></div>
 </div></section>
 <section class="section"><div class="section-row"><div><div class="section-title">Brand images</div><div class="page-subtitle">Shown at the top of your public menu.</div></div></div>
 <div class="card form-card">
  <div class="brand-preview"><div class="brand-preview-banner">${r.banner?`<img src="${ctx.escapeHtml(r.banner)}" alt="">`:`<span>${ctx.icon('image',18)} No banner</span>`}</div><div class="brand-preview-avatar">${r.avatar?`<img src="${ctx.escapeHtml(r.avatar)}" alt="">`:ctx.icon('image',16)}</div></div>
  <div class="field"><label for="set-banner">Banner image</label><select id="set-banner" data-setting="banner"><option value="/hap/assets/banner.jpg" ${r.banner==='/hap/assets/banner.jpg'?'selected':''}>Seaside terrace</option><option value="/hap/assets/grilled-octopus.webp" ${r.banner==='/hap/assets/grilled-octopus.webp'?'selected':''}>Signature dish</option><option value="/hap/assets/margherita.webp" ${r.banner==='/hap/assets/margherita.webp'?'selected':''}>Pizza oven</option><option value="" ${!r.banner?'selected':''}>No banner (placeholder)</option></select></div>
  <div class="field"><label for="set-avatar">Profile image</label><select id="set-avatar" data-setting="avatar"><option value="/hap/assets/sofra-logo.svg" ${r.avatar==='/hap/assets/sofra-logo.svg'?'selected':''}>Restaurant logo</option><option value="/hap/assets/truffle-burger.webp" ${r.avatar==='/hap/assets/truffle-burger.webp'?'selected':''}>Dish close-up</option><option value="" ${!r.avatar?'selected':''}>No image (placeholder)</option></select></div>
 </div></section>
  ${ctx.currencyCard()}
 <section class="section"><div class="section-row"><div class="section-title">Opening hours</div></div>
  <div class="card list-card">${o.hours.map(([d,h],i)=>`<div class="system-row"><strong>${d}</strong><input class="inline-input" data-hours="${i}" value="${ctx.escapeHtml(h)}" aria-label="${d} hours"></div>`).join('')}</div>
 </section>
 <section class="section"><div class="section-row"><div class="section-title">Notifications</div></div><div class="settings-list">
  ${[['dailySummary','Daily summary','Sales recap at closing'],['lowStock','Sold-out reminders','Nudge to restock dishes']].map(([k,t,s])=>`<div class="card settings-row"><div class="settings-copy"><strong>${t}</strong><span>${s}</span></div><button class="switch ${o.notifications[k]?'on':''}" role="switch" aria-checked="${!!o.notifications[k]}" aria-label="${t}" data-action="toggle-notification" data-key="${k}"><i></i></button></div>`).join('')}
 </div></section>
 <button class="btn primary full" data-action="save-restaurant-settings">Save changes</button>`;
}

/* ---------------- sheets ---------------- */
function sheet(name,ctx,shell){
 const d=ctx.ui.sheetData||{};
 if(name==='opsUser'){
  const u=ctx.state.platform.users.find(x=>x.id===d.id); if(!u) return '';
  return shell(ctx.escapeHtml(u.name),ctx.escapeHtml(u.email),`
   <div class="form-grid">
    <div class="field"><label for="u-role">Role</label><select id="u-role" data-ops-field="role">${['Owner','Manager','Server','Support'].map(r=>`<option ${u.role===r?'selected':''}>${r}</option>`).join('')}</select></div>
    <button class="btn primary full" data-action="save-user" data-id="${u.id}">Save changes</button>
    <button class="btn soft full" data-action="reset-password" data-id="${u.id}">Send password reset</button>
    <button class="btn danger full" data-action="suspend-user" data-id="${u.id}">${u.status==='Suspended'?'Restore access':'Suspend user'}</button>
   </div>`);
 }
 if(name==='opsPlan'){
  const p=ctx.state.platform.plans.find(x=>x.id===d.id); if(!p) return '';
  return shell(`Edit ${ctx.escapeHtml(p.name)}`,'Pricing and limits',`
   <div class="form-grid">
    <div class="field"><label for="p-price">Monthly price (ALL)</label><input id="p-price" type="number" min="0" step="1" value="${p.price}" data-ops-field="price"></div>
    <div class="field"><label for="p-lang">Languages included</label><input id="p-lang" type="number" min="1" value="${p.features.languages}" data-ops-field="languages"></div>
    <div class="field"><label for="p-staff">Staff seats</label><input id="p-staff" type="number" min="1" value="${p.features.staff}" data-ops-field="staff"></div>
    <button class="btn primary full" data-action="save-plan" data-id="${p.id}">Save changes</button>
   </div>`);
 }
 if(name==='opsEmail'){
  const e=ctx.state.platform.settings.emails.find(x=>x.id===d.id); if(!e) return '';
  return shell(ctx.escapeHtml(e.name),'Email template',`
   <div class="form-grid">
    <div class="field"><label for="e-subject">Subject line</label><input id="e-subject" value="${ctx.escapeHtml(e.subject)}" data-ops-field="subject"></div>
    <div class="field"><label for="e-status">Status</label><select id="e-status" data-ops-field="status">${['Live','Draft'].map(s=>`<option ${e.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
    <button class="btn primary full" data-action="save-email" data-id="${e.id}">Save changes</button>
   </div>`);
 }
 if(name==='opsLanguages'){
  const s=ctx.state.platform.settings;
  return shell('Supported languages','Available to every restaurant',`
   <div class="form-grid"><div class="chip-wrap">${s.languages.map(l=>`<button class="soft-chip removable" data-action="remove-language" data-lang="${ctx.escapeHtml(l)}">${ctx.escapeHtml(l)} ${ctx.icon('close',11)}</button>`).join('')}</div>
   <div class="field"><label for="l-new">Add a language</label><input id="l-new" placeholder="e.g. Spanish" data-ops-field="language"></div>
   <button class="btn primary full" data-action="add-language">Add language</button></div>`);
 }
 if(name==='opsStaff'){
  const s=ctx.state.ops.staff.find(x=>x.id===d.id);
   const permissions=s?.permissions||permsFor(s?.role||'Server');
   const activity=(ctx.state.ops.activity||[]).filter(x=>x.actorId===s?.id).slice(0,6);
  return shell(s?ctx.escapeHtml(s.name):'Invite team member',s?ctx.escapeHtml(s.email):'They get access right away',`
   <div class="form-grid">
    <div class="field"><label for="s-name">Full name</label><input id="s-name" value="${s?ctx.escapeHtml(s.name):''}" placeholder="e.g. Ana Leka" data-ops-field="name"></div>
    <div class="field"><label for="s-email">Email</label><input id="s-email" type="email" value="${s?ctx.escapeHtml(s.email):''}" placeholder="name@restaurant.al" data-ops-field="email"></div>
    <div class="field"><label for="s-role">Role</label><select id="s-role" data-ops-field="role">${['Owner','Manager','Server','Kitchen'].map(r=>`<option ${s&&s.role===r?'selected':''}>${r}</option>`).join('')}</select></div>
     ${s?`<div><div class="sheet-label">Permissions</div><div class="card form-card">${PERMISSION_KEYS.map(([key,label])=>`<div class="perm-row"><span>${label}</span><strong class="perm-mark ${permissions[key]?'on':''}">${permissions[key]?'Allowed':'No access'}</strong></div>`).join('')}</div></div>
     <div><div class="sheet-label">Recent activity · prototype</div><div class="card form-card">${activity.length?activity.map(x=>`<div class="log-row"><strong>${ctx.escapeHtml(x.action)} · ${ctx.escapeHtml(x.entityName)}</strong><span>${x.from!=null&&x.to!=null?`${ctx.escapeHtml(String(x.from))} → ${ctx.escapeHtml(String(x.to))} · `:''}${new Date(x.at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span></div>`).join(''):'<div class="empty-inline">No recorded changes yet.</div>'}</div></div>`:''}
    <button class="btn primary full" data-action="save-staff" ${s?`data-id="${s.id}"`:''}>Save changes</button>
    ${s?`<button class="btn danger full" data-action="suspend-staff" data-id="${s.id}">${s.status==='Suspended'?'Restore access':'Suspend access'}</button>`:''}
   </div>`);
 }
 if(name==='opsCategory'){
  return shell('Add category','Keep names short and scannable',`
   <div class="form-grid"><div class="field"><label for="c-name">Category name</label><input id="c-name" placeholder="e.g. Breakfast" data-ops-field="name"></div>
   <button class="btn primary full" data-action="save-ops-category">Save changes</button></div>`);
 }
 if(name==='opsItem'){
  const cats=opsMenuOf(ctx,d.rid); const cat=cats.find(c=>c.id===d.cid); const item=cat&&cat.items.find(i=>i.id===d.iid);
   const primary=currencyOfRestaurant(ctx,d.rid).primary;
  return shell(item?'Edit dish':'Add dish',cat?ctx.escapeHtml(cat.name):'',`
   <div class="form-grid">
    <div class="field"><label for="i-name">Dish name</label><input id="i-name" value="${item?ctx.escapeHtml(item.name):''}" placeholder="e.g. Wild mushroom risotto" data-ops-field="name"></div>
     <div class="field"><label for="i-price">Price (${primary})</label><input id="i-price" type="number" min="0" step="0.5" value="${item?item.price:9}" data-ops-field="price"></div>
    <div class="field"><label for="i-status">Availability</label><select id="i-status" data-ops-field="status"><option value="available" ${item&&item.status==='available'?'selected':''}>Available</option><option value="soldout" ${item&&item.status==='soldout'?'selected':''}>Sold out</option></select></div>
    <button class="btn primary full" data-action="save-ops-item">Save changes</button>
   </div>`);
 }
 return '';
}

/* ---------------- actions ---------------- */
function actions(a,btn,ctx){
 const d=btn.dataset;
 const done=(msg)=>{ ctx.save(); if(msg) ctx.toast(msg); ctx.render(); return true; };
 switch(a){
  case 'super-subpage': ctx.ui.subId=d.id; ctx.state.adminSubpage=d.page; return done();
  case 'grant-access': {
   const r=ctx.state.superadmin.restaurants.find(x=>x.id===d.id); if(!r) return true;
   const found=GRANT_DURATIONS.find(g=>g[0]===d.duration)||GRANT_DURATIONS[1];
   const today=new Date();
   const endsAt = found[2]===null ? null : new Date(today.getTime()+found[2]*86400000).toISOString().slice(0,10);
   r.subscription={...subOf(r),status:'active',accessSource:'manual',endsAt,billingInterval:null,
    grant:{grantedBy:'Hap Control',grantedAt:today.toISOString().slice(0,10),reason:'Granted from Hap Control',duration:found[0]}};
   if(r.status==='Suspended') r.status='Live';
   return done(found[2]===null?'Lifetime access granted':`Access granted for ${found[1]}`);
  }
  case 'super-filter': ctx.ui.superFilter=d.filter; return done();
  case 'user-filter': ctx.ui.userFilter=d.filter; return done();
  case 'save-restaurant': {
   const r=ctx.state.superadmin.restaurants.find(x=>x.id===d.id); if(!r) return true;
   r.name=val('ra-name',r.name); r.owner=val('ra-owner',r.owner); r.status=val('ra-status',r.status); r.plan=val('ra-plan',r.plan);
   return done('Restaurant saved');
  }
  case 'suspend-restaurant': {
   const r=ctx.state.superadmin.restaurants.find(x=>x.id===d.id); if(!r) return true;
   if(r.status==='Suspended'){ r.status='Live'; return done('Account restored'); }
   ctx.confirm({title:'Suspend this account?',body:`${r.name}'s public menu goes offline immediately. You can restore it at any time.`,label:'Suspend account',tone:'danger',run(){ r.status='Suspended'; done('Account suspended'); }});
   return true;
  }
  case 'save-user': {
   const u=ctx.state.platform.users.find(x=>x.id===d.id); if(!u) return true;
   u.role=val('u-role',u.role); ctx.ui.sheet=null; return done('User saved');
  }
  case 'reset-password': ctx.ui.sheet=null; return done('Password reset email sent');
  case 'suspend-user': {
   const u=ctx.state.platform.users.find(x=>x.id===d.id); if(!u) return true;
   if(u.status==='Suspended'){ u.status='Active'; ctx.ui.sheet=null; return done('Access restored'); }
   ctx.confirm({title:'Suspend this user?',body:`${u.name} loses access to every Hap workspace until you restore them.`,label:'Suspend user',tone:'danger',run(){ u.status='Suspended'; ctx.ui.sheet=null; done('User suspended'); }});
   return true;
  }
  case 'toggle-plan-feature': {
   const p=ctx.state.platform.plans.find(x=>x.id===d.plan); if(!p) return true;
   p.features[d.key]=!p.features[d.key]; return done(`${p.name} updated`);
  }
  case 'save-plan': {
   const p=ctx.state.platform.plans.find(x=>x.id===d.id); if(!p) return true;
   p.price=Number(val('p-price',p.price))||p.price; p.features.languages=Number(val('p-lang',p.features.languages))||p.features.languages; p.features.staff=Number(val('p-staff',p.features.staff))||p.features.staff;
   ctx.ui.sheet=null; return done('Plan saved');
  }
  case 'toggle-platform': ctx.state.platform.settings[d.key]=!ctx.state.platform.settings[d.key]; return done('Setting updated');
  case 'save-platform-settings': ctx.state.platform.settings.trialDays=Number(val('trial-days',14)); return done('Settings saved');
  case 'save-email': {
   const e=ctx.state.platform.settings.emails.find(x=>x.id===d.id); if(!e) return true;
   e.subject=val('e-subject',e.subject); e.status=val('e-status',e.status); ctx.ui.sheet=null; return done('Template saved');
  }
  case 'add-language': {
   const v=val('l-new','').trim(); if(!v){ ctx.toast('Enter a language name first'); return true; }
   if(!ctx.state.platform.settings.languages.includes(v)) ctx.state.platform.settings.languages.push(v);
   return done('Language added');
  }
  case 'remove-language': {
   ctx.state.platform.settings.languages=ctx.state.platform.settings.languages.filter(l=>l!==d.lang);
   return done('Language removed');
  }
  case 'save-staff': {
   const name=val('s-name','').trim(); if(!name){ ctx.toast('Enter a name first'); return true; }
    const role=val('s-role','Server');
    const payload={name,email:val('s-email',''),role,permissions:permsFor(role)};
   const existing=ctx.state.ops.staff.find(x=>x.id===d.id);
   if(existing) Object.assign(existing,payload);
   else ctx.state.ops.staff.push({id:'s'+Date.now(),...payload,status:'Active',last:'Invited just now'});
   ctx.ui.sheet=null; return done(existing?'Team member saved':'Invite sent');
  }
  case 'suspend-staff': {
   const s=ctx.state.ops.staff.find(x=>x.id===d.id); if(!s) return true;
   if(s.status==='Suspended'){ s.status='Active'; ctx.ui.sheet=null; return done('Access restored'); }
   ctx.confirm({title:'Suspend this team member?',body:`${s.name} is signed out and cannot edit the menu until you restore access.`,label:'Suspend access',tone:'danger',run(){ s.status='Suspended'; ctx.ui.sheet=null; done('Access suspended'); }});
   return true;
  }
  case 'toggle-notification': ctx.state.ops.notifications[d.key]=!ctx.state.ops.notifications[d.key]; return done('Notifications updated');
  case 'save-restaurant-settings': {
   document.querySelectorAll('[data-setting]').forEach(el=>{ ctx.state.restaurant[el.dataset.setting]=el.value; });
   document.querySelectorAll('[data-hours]').forEach(el=>{ ctx.state.ops.hours[Number(el.dataset.hours)][1]=el.value; });
   return done('Settings saved');
  }
  case 'ops-add-category': ctx.ui.sheet='opsCategory'; ctx.ui.sheetData={rid:d.rid}; return done();
  case 'save-ops-category': {
   const name=val('c-name','').trim(); if(!name){ ctx.toast('Enter a category name first'); return true; }
   opsMenuOf(ctx,ctx.ui.sheetData.rid).push({id:'c'+Date.now(),name,items:[]});
   ctx.ui.sheet=null; return done('Category added');
  }
  case 'ops-delete-category': {
   const cats=opsMenuOf(ctx,d.rid); const c=cats.find(x=>x.id===d.cid); if(!c) return true;
   ctx.confirm({title:'Delete this category?',body:`“${c.name}” and its ${c.items.length} ${c.items.length===1?'dish':'dishes'} are removed from the menu.`,label:'Delete category',tone:'danger',run(){
    const arr=opsMenuOf(ctx,d.rid); const i=arr.findIndex(x=>x.id===d.cid); if(i>-1) arr.splice(i,1); done('Category deleted');
   }});
   return true;
  }
  case 'ops-add-item': ctx.ui.sheet='opsItem'; ctx.ui.sheetData={rid:d.rid,cid:d.cid}; return done();
  case 'ops-edit-item': ctx.ui.sheet='opsItem'; ctx.ui.sheetData={rid:d.rid,cid:d.cid,iid:d.iid}; return done();
  case 'save-ops-item': {
   const sd=ctx.ui.sheetData||{}; const cats=opsMenuOf(ctx,sd.rid); const cat=cats.find(c=>c.id===sd.cid); if(!cat) return true;
   const name=val('i-name','').trim(); if(!name){ ctx.toast('Enter a dish name first'); return true; }
   const payload={name,price:Number(val('i-price',0))||0,status:val('i-status','available')};
   const item=cat.items.find(i=>i.id===sd.iid);
   if(item) Object.assign(item,payload); else cat.items.push({id:'i'+Date.now(),...payload,description:'Freshly prepared by the kitchen.',image:'/hap/assets/burrata-tomato.webp',dietary:[],promotion:{active:false}});
   ctx.ui.sheet=null; return done(item?'Dish saved':'Dish added');
  }
  case 'ops-delete-item': {
   const cats=opsMenuOf(ctx,d.rid); const cat=cats.find(c=>c.id===d.cid); const item=cat&&cat.items.find(i=>i.id===d.iid); if(!item) return true;
   ctx.confirm({title:'Delete this dish?',body:`“${item.name}” is removed from the menu immediately.`,label:'Delete dish',tone:'danger',run(){ cat.items=cat.items.filter(i=>i.id!==d.iid); done('Dish deleted'); }});
   return true;
  }
 }
 return false;
}
function val(id,fallback){ const el=document.getElementById(id); return el?el.value:fallback; }

window.HapOps={
 defaults,
 superPages:{overview,restaurants,users,plans,settings:superSettings},
 superSubpages:{restaurant:restaurantDetail,menu:restaurantMenu},
 adminPages:{staff},
 adminSubpages:{opsSettings:adminSettings},
 sheet,actions,emptyState,kpi,pill,toneFor,backHead
};
})();
