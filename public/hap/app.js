
(() => {
'use strict';
/* ---------- pathname routing ----------
   The application runs directly inside the host document. The host declares
   which screen to open through window.HapHost before loading this file; the
   query string of a standalone page load is used as a fallback. */
const HOST = (typeof window !== 'undefined' && window.HapHost) || null;
const QS = new URLSearchParams(HOST ? (HOST.query || '') : location.search);
const PUBLIC_CTX = QS.get('ctx') === 'public';
const PUBLIC_SLUG = QS.get('slug') || '';

/* ---------- tenancy ----------
   Which restaurant you are administering is a property of the URL
   (/r/<slug>/admin/...), never of a hidden mode. Storage follows the same
   rule: one record per restaurant instead of one global blob. */
const DEFAULT_SLUG = 'sofra';
const LEGACY_STORAGE_KEY = 'hapPrototypeV4';
function slugFromPath(path){
 const m = /^\/r\/([a-z0-9-]+)(\/|$)/i.exec(String(path||''));
 return m ? m[1].toLowerCase() : '';
}
const ACTIVE_SLUG = (PUBLIC_CTX ? PUBLIC_SLUG : slugFromPath(QS.get('p') || '')) || DEFAULT_SLUG;
/* All persistence goes through the data service (data.js); nothing below
   touches a storage medium directly. */
const Data = window.HapData;
const app = document.getElementById('app');
const toastLayer = document.getElementById('toast-layer');

let lastPath = '';

const ADMIN_TAB_PATHS = {home:'/admin',menu:'/admin/menu',insights:'/admin/insights',settings:'/admin/settings'};
/* Menu is the single workspace: items, the template picker and promotions all
   live behind one destination, each with its own URL. */
const MENU_TAB_PATHS = {items:'/admin/menu',design:'/admin/menu/design',promotions:'/admin/menu/promotions'};
const MENU_TABS = [['items','Items'],['design','Design'],['promotions','Promotions']];
/* Settings and Insights are one screen each, split by tabs instead of rows
   that only navigate. The tab is remembered in ui, never in the URL. */
const SETTINGS_TABS = [['restaurant','Restaurant'],['team','Team'],['billing','Billing']];
const INSIGHT_TABS = [['traffic','Traffic'],['dishes','Dishes'],['guests','Guests']];
function settingsTab(){ return SETTINGS_TABS.some(t=>t[0]===ui.settingsTab) ? ui.settingsTab : 'restaurant'; }
function insightsTab(){ return INSIGHT_TABS.some(t=>t[0]===ui.insightsTab) ? ui.insightsTab : 'traffic'; }
/* Embedded pages keep their body but lose their own back-row / page-head,
   because the hosting screen already provides one. */
function stripHeads(html){
 const box=document.createElement('div');
 box.innerHTML=html;
 box.querySelectorAll(':scope > .back-row, :scope > .page-head').forEach(n=>n.remove());
 return box.innerHTML;
}
/* Sub-pages always declare the tab that owns them, so a deep link keeps the
   right destination highlighted in the bottom navigation. */
const ADMIN_SUBPAGES = {
 qr:{path:'/admin/menu/qr',tab:'menu'},
 restaurant:{path:'/admin/settings/restaurant',tab:'settings'},
 team:{path:'/admin/settings/team',tab:'settings'},
 billing:{path:'/admin/settings/billing',tab:'settings'}
};
const ADMIN_LEGACY_PATHS = {
 '/admin/home':'/admin',
 '/admin/promotions':'/admin/menu/promotions',
 '/admin/promote':'/admin/menu/promotions',
 '/admin/analytics':'/admin/insights',
 '/admin/qr':'/admin/menu/qr',
 '/admin/design':'/admin/menu/design',
 '/admin/appearance':'/admin/menu/design',
 '/admin/settings/appearance':'/admin/menu/design',
 '/admin/staff':'/admin/settings/team',
 '/admin/billing':'/admin/settings/billing',
 '/admin/more':'/admin/settings'
};
const ADMIN_LEGACY_TABS = {promotions:'menu',promote:'menu',analytics:'insights',more:'settings'};
const ADMIN_LEGACY_SUBPAGES = {settings:'restaurant',staff:'team'};
const SUPER_TAB_PATHS = {overview:'/super',restaurants:'/super/restaurants',users:'/super/users',plans:'/super/plans',settings:'/super/settings'};
function menuTab(){ return MENU_TAB_PATHS[ui.menuTab] ? ui.menuTab : 'items'; }
function setMenuTab(tab){ state.adminTab='menu'; state.adminSubpage=null; ui.menuTab=MENU_TAB_PATHS[tab]?tab:'items'; }
function normalizeAdminState(){
 if(state.adminSubpage && ADMIN_LEGACY_SUBPAGES[state.adminSubpage]) state.adminSubpage=ADMIN_LEGACY_SUBPAGES[state.adminSubpage];
 /* Appearance was folded into Menu › Design; old saved state lands there. */
 if(state.adminSubpage==='appearance'){ state.adminSubpage=null; setMenuTab('design'); }
 if(state.adminSubpage && !ADMIN_SUBPAGES[state.adminSubpage]) state.adminSubpage=null;
 if(state.role!=='super'){
  if(state.adminTab==='promote'||state.adminTab==='promotions'){ setMenuTab('promotions'); }
  else if(ADMIN_LEGACY_TABS[state.adminTab]) state.adminTab=ADMIN_LEGACY_TABS[state.adminTab];
  if(state.adminSubpage) state.adminTab=ADMIN_SUBPAGES[state.adminSubpage].tab;
  else if(!ADMIN_TAB_PATHS[state.adminTab]) state.adminTab='home';
 }
}
/* Admin URLs carry the restaurant: /r/<slug>/admin/... The unscoped /admin/...
   form stays valid and is redirected by the host to the current restaurant. */
function adminPath(p){ return `/r/${ACTIVE_SLUG}${p}`; }
function stripTenant(p){
 const m = /^\/r\/[a-z0-9-]+(\/admin.*)$/i.exec(p);
 return m ? m[1] : p;
}
/* Set when a retired /preview URL is opened: the app boots into admin and then
   leaves for the real public menu. */
let pendingMenuRedirect = false;
function currentPath(){
 if(state.mode==='landing') return '/';
 if(state.mode==='preview') return '/menu/'+menuSlug();
 if(state.role==='super') return SUPER_TAB_PATHS[state.adminTab] || '/super';
 normalizeAdminState();
 if(state.adminSubpage) return adminPath(ADMIN_SUBPAGES[state.adminSubpage].path);
 if(state.adminTab==='menu') return adminPath(MENU_TAB_PATHS[menuTab()]);
 return adminPath(ADMIN_TAB_PATHS[state.adminTab] || '/admin');
}
function applyPath(path){
 let p = String(path||'/').split('?')[0].replace(/\/+$/,'') || '/';
 if(p==='/'){ state.mode='landing'; return; }
 /* Preview was demoted from a mode to an action: the URL survives, but it
    resolves to the public menu instead of a second copy of the guest view. */
 if(p==='/preview'){ state.mode='admin'; state.role='restaurant'; state.adminTab='home'; state.adminSubpage=null; pendingMenuRedirect=true; return; }

 if(p==='/super' || p.startsWith('/super/')){
  const seg = p==='/super' ? 'overview' : p.slice(7);
  const tab = Object.keys(SUPER_TAB_PATHS).find(k=>k===seg) || 'overview';
  state.mode='admin'; state.role='super'; state.adminTab=tab; state.adminSubpage=null; return;
 }
 p = stripTenant(p);
 if(ADMIN_LEGACY_PATHS[p]) p=ADMIN_LEGACY_PATHS[p];
 state.mode='admin'; state.role='restaurant';
 if(p==='/admin/promote/new'||p==='/admin/menu/promotions/new'){ setMenuTab('promotions'); ui.sheet='promoChooser'; ui.sheetData={}; return; }
 const menu = Object.keys(MENU_TAB_PATHS).find(k=>MENU_TAB_PATHS[k]===p);
 if(menu){ setMenuTab(menu); return; }
 const sub = Object.keys(ADMIN_SUBPAGES).find(k=>ADMIN_SUBPAGES[k].path===p);
 if(sub){ state.adminSubpage=sub; state.adminTab=ADMIN_SUBPAGES[sub].tab; return; }
 const tab = Object.keys(ADMIN_TAB_PATHS).find(k=>ADMIN_TAB_PATHS[k]===p);
 state.adminSubpage=null; state.adminTab=tab||'home';
}

/* The public menu is a place, not a mode: "View menu" leaves the admin
   application and opens the real guest URL for this restaurant. */
function menuSlug(){ return ACTIVE_SLUG; }

/* One way out for every navigation the application performs: hand the path to
   the host so the browser URL follows the visible screen. */
function emitNavigate(path){
 if(HOST && typeof HOST.onNavigate==='function'){
  try{ HOST.onNavigate(path); return true; }catch(e){}
 }
 if(window.parent && window.parent!==window){
  try{ window.parent.postMessage({type:'hap:navigate',path}, location.origin); return true; }catch(e){}
 }
 return false;
}

function openPublicMenu(){
 const path = `/menu/${menuSlug()}`;
 ui.sheet=null; ui.modal=null;
 if(!emitNavigate(path)) location.href = path;
}

/* Access is a property of the signed-in member, never of a mode switch. A
   screen the member may not open renders this state instead of empty data. */
const ACCESS_KEYS = ['menu','prices','promotions','design','billing','staff'];
function access(){
 const a = (state.session && state.session.access) || {};
 const o={}; ACCESS_KEYS.forEach(k=>{ o[k] = a[k]!==false; }); return o;
}
function canAccess(key){ return !key || access()[key]!==false; }
const TAB_ACCESS = {menu:'menu',promote:'promotions'};
const SUBPAGE_ACCESS = {qr:'menu',team:'staff',billing:'billing'};
const ACCESS_LABELS = {menu:'the menu',prices:'prices',promotions:'promotions',design:'the menu design',billing:'billing',staff:'the team'};
/* A restricted screen renders this instead of empty data, so a member always
   knows the screen exists and who can open it for them. */
function noPermissionPage(key,title){
 return `<div class="no-permission" role="status">
  <div class="no-permission-icon">${icon('lock',22)}</div>
  <strong>${escapeHtml(title||'You do not have access')}</strong>
  <p>Your account cannot open ${escapeHtml(ACCESS_LABELS[key]||'this section')}. Ask an owner or manager to change your permissions in Settings &rsaquo; Team.</p>
 </div>`;
}




function syncPath(){
 if(PUBLIC_CTX) return;
 const p=currentPath();
 if(p===lastPath) return;
 lastPath=p;
 emitNavigate(p);
}
/* A route change that happened outside the application (host links, back and
   forward) is applied here. */
function applyHostRoute(path){
 if(typeof path!=='string') return;
 if(path===currentPath()){ lastPath=path; return; }
 applyPath(path); lastPath=path; save(); render();
}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin) return;
 const d=e.data;
 if(!d || d.type!=='hap:route' || typeof d.path!=='string') return;
 applyHostRoute(d.path);
});

const ICONS = {
 home:'<path d="M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3z"/>',
 menu:'<path d="M4 5h16M4 12h16M4 19h16"/>',
 spark:'<path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Zm6 11 .9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9L18 14Z"/>',
 qr:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 14h3v7h-3M14 18h3v3h-3"/>',
 more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
 moon:'<path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.4 3 14.6 0 18M12 3c-3 3.4-3 14.6 0 18"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 eye:'<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
 grid:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
 palette:'<path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a1.5 1.5 0 0 1 0-3h2a7 7 0 0 0-2-11Z"/><circle cx="7" cy="10" r="1"/><circle cx="9" cy="6.5" r="1"/><circle cx="14" cy="6.5" r="1"/>',
 chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20V8"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21h-4v-.09a1.7 1.7 0 0 0-1.1-1.51 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V3h4v.09A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.12.36.33.7.6 1 .27.27.62.48 1 .6h.09v4H21a1.7 1.7 0 0 0-1.6.4Z"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 back:'<path d="m15 18-6-6 6-6"/>',
 edit:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
 eyeOff:'<path d="m3 3 18 18M10.6 10.6A2 2 0 0 0 13.4 13.4M9.9 4.2A10.6 10.6 0 0 1 12 4c6 0 9.5 8 9.5 8a15 15 0 0 1-2.1 3.2M6.6 6.6C4 8.3 2.5 12 2.5 12s3.5 8 9.5 8a9.7 9.7 0 0 0 4.1-.9"/>',
 download:'<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
 share:'<circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5M6 8a7 7 0 0 1 12-2l2 2M18 16a7 7 0 0 1-12 2l-2-2"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 activity:'<path d="M3 12h4l2-7 4 14 2-7h6"/>',
 server:'<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
 building:'<path d="M4 21V5l8-3 8 3v16M9 9h2M9 13h2M9 17h2M15 9h2M15 13h2M15 17h2"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
 up:'<path d="m6 15 6-6 6 6"/>',
 down:'<path d="m6 9 6 6 6-6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 lock:'<rect x="4" y="10" width="16" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 location:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/>',
 phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/>',
 flame:'<path d="M12 3c.6 2.6 2.3 3.6 3.4 5.2A6 6 0 0 1 12 21a6 6 0 0 1-3.4-10.9C9.9 8.6 11.4 6.6 12 3Z"/><path d="M12 21a2.6 2.6 0 0 1-1.4-4.8c.7-.5 1.2-1.2 1.4-2 .3.9.9 1.5 1.5 2A2.6 2.6 0 0 1 12 21Z"/>',
 chili:'<path d="M14.5 4.5c0-1 .8-1.8 1.8-1.8M14.5 4.5c3 1.5 3.8 5 2 8.1C14.5 16.2 10.7 18.5 7 18.5H4.8c0-3.2 1.7-6.1 4.4-7.7 1.9-1.2 4-3.1 5.3-6.3Z"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 17.5 4.6-4.2a2 2 0 0 1 2.7 0L20 20"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/>',
 copy:'<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15"/>'
};

/* Photo presets — one shared list used by both the Add and the Edit sheet. */
const PHOTO_PRESETS = [
 ['/hap/assets/burrata-tomato.webp','Fresh plate'],
 ['/hap/assets/penne-arrabbiata.webp','Pasta'],
 ['/hap/assets/margherita.webp','Pizza'],
 ['/hap/assets/grilled-octopus.webp','Grill'],
 ['/hap/assets/sea-bass.webp','Fish'],
 ['/hap/assets/caesar-salad.webp','Salad'],
 ['/hap/assets/tomato-soup.webp','Soup'],
 ['/hap/assets/truffle-burger.webp','Burger'],
 ['/hap/assets/tiramisu.webp','Dessert'],
 ['/hap/assets/pistachio-cheesecake.webp','Cake']
];
function photoPresetField(current){
 const list = PHOTO_PRESETS.some(p=>p[0]===current) || !current ? PHOTO_PRESETS : [[current,'Current photo'],...PHOTO_PRESETS];
 const value = current || PHOTO_PRESETS[0][0];
 return `<div class="field"><label>Photo preset</label><select name="image">${list.map(([src,name])=>`<option value="${escapeHtml(src)}" ${src===value?'selected':''}>${escapeHtml(name)}</option>`).join('')}</select></div>`;
}
const STATUS_OPTIONS = [['available','Available'],['soldout','Sold out'],['hidden','Hidden']];
function statusField(current){
 const cur = STATUS_OPTIONS.some(s=>s[0]===current) ? current : 'available';
 return `<div class="field"><label>Status</label><div class="segment-control seg-radio">${STATUS_OPTIONS.map(([id,name])=>`<label class="${cur===id?'active':''}"><input type="radio" name="status" value="${id}" ${cur===id?'checked':''}><span>${name}</span></label>`).join('')}</div><small class="field-hint">Hidden dishes disappear from the public menu entirely.</small></div>`;
}


function icon(name,size=20){ return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.more}</svg>`; }
function preferredScrollBehavior(){ return window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'; }

const languages = [
 ['EN','English','English'],['SQ','Shqip','Albanian'],['IT','Italiano','Italian'],['DE','Deutsch','German'],['FR','Français','French'],['ES','Español','Spanish'],['EL','Ελληνικά','Greek'],['PT','Português','Portuguese'],['NL','Nederlands','Dutch'],['PL','Polski','Polish'],['TR','Türkçe','Turkish'],['RO','Română','Romanian'],['SR','Srpski','Serbian'],['HR','Hrvatski','Croatian'],['UK','Українська','Ukrainian'],['SV','Svenska','Swedish'],['NO','Norsk','Norwegian'],['DA','Dansk','Danish'],['CS','Čeština','Czech'],['JA','日本語','Japanese'],['ZH','中文','Chinese'],['KO','한국어','Korean'],['AR','العربية','Arabic']
];


/* ---------------- Guest interface language ----------------
   Item and category text is restaurant-authored and translated through
   `item.i18n`. Everything the *product* says — search, filters, allergen
   wording, price affordances — lives here instead. EN is the fallback for
   any key a language has not covered, so a partial table never blanks a
   label. Only the guest surfaces read this; admin stays English. */
const UI_STRINGS = {
 EN:{
  search:'Search the menu', filters:'Filters', filtersAria:'Filters and allergen key',
  language:'Language', currentLanguage:'Current language', chooseLanguage:'Choose menu language',
  languageSub:'The languages this menu is published in.',
  seeDetails:'See details', detailsAria:'See dish details for',
  soldOut:'Sold out', contains:'Contains', containsOne:'Contains',
  item:'item', items:'items', from:'from', approx:'≈',
  recommended:'Recommended', offerNow:'Offer available now', offerIncludes:'Offer includes',
  noMatch:'No dishes match that filter.', noResults:'Nothing matches that search.',
  emptyMenu:'This menu has no dishes yet.',
  bannerImage:'Banner image', openingHours:'Opening hours',
  dietary:'Dietary', allergenGuide:'Allergen guide',
  allergenGuideSub:'The 14 allergens restaurants must declare.',
  filtersSub:'Narrow the menu, or read the allergen key.',
  allergyNote:'Always tell staff about a severe allergy — kitchens share equipment.',
  noAllergens:'No declared allergens.',
  displayCurrency:'Display currency', displayCurrencySub:'Approximate conversions set by the restaurant.',
  menuPrice:'Menu price', approximate:'Approximate', youPayIn:'You always pay in',
  changeCurrency:'Change display currency', all:'All',
  diet_vegetarian:'Vegetarian', diet_vegan:'Vegan', diet_glutenfree:'Gluten free', diet_halal:'Halal',
  spice_0:'Not spicy', spice_1:'Mild', spice_2:'Spicy', spice_3:'Very spicy'
 },
 SQ:{
  search:'Kërko në menu', filters:'Filtra', filtersAria:'Filtra dhe lista e alergeneve',
  language:'Gjuha', currentLanguage:'Gjuha aktuale', chooseLanguage:'Zgjidh gjuhën e menusë',
  languageSub:'Gjuhët në të cilat është publikuar kjo menu.',
  seeDetails:'Shiko detajet', detailsAria:'Shiko detajet e pjatës',
  soldOut:'Mbaroi', contains:'Përmban', containsOne:'Përmban',
  item:'pjatë', items:'pjata', from:'nga', approx:'≈',
  recommended:'Rekomandohet', offerNow:'Ofertë e disponueshme tani', offerIncludes:'Oferta përfshin',
  noMatch:'Asnjë pjatë nuk përputhet me filtrin.', noResults:'Asgjë nuk përputhet me kërkimin.',
  emptyMenu:'Kjo menu ende nuk ka pjata.',
  bannerImage:'Foto ballore', openingHours:'Orari i hapjes',
  dietary:'Dieta', allergenGuide:'Udhëzues alergenësh',
  allergenGuideSub:'14 alergenët që restorantet duhet t’i deklarojnë.',
  filtersSub:'Ngushto menunë ose lexo listën e alergeneve.',
  allergyNote:'Njoftoni gjithmonë stafin për një alergji të rëndë — kuzhinat ndajnë të njëjtat pajisje.',
  noAllergens:'Asnjë alergen i deklaruar.',
  displayCurrency:'Monedha e shfaqur', displayCurrencySub:'Konvertime të përafërta të vendosura nga restoranti.',
  menuPrice:'Çmimi i menusë', approximate:'I përafërt', youPayIn:'Ju paguani gjithmonë në',
  changeCurrency:'Ndrysho monedhën e shfaqur', all:'Të gjitha',
  diet_vegetarian:'Vegjetariane', diet_vegan:'Vegane', diet_glutenfree:'Pa gluten', diet_halal:'Hallall',
  spice_0:'Jo pikante', spice_1:'E lehtë', spice_2:'Pikante', spice_3:'Shumë pikante'
 },
 IT:{
  search:'Cerca nel menu', filters:'Filtri', filtersAria:'Filtri e guida agli allergeni',
  language:'Lingua', currentLanguage:'Lingua attuale', chooseLanguage:'Scegli la lingua del menu',
  languageSub:'Le lingue in cui è pubblicato questo menu.',
  seeDetails:'Vedi dettagli', detailsAria:'Vedi i dettagli del piatto',
  soldOut:'Esaurito', contains:'Contiene', containsOne:'Contiene',
  item:'piatto', items:'piatti', from:'da', approx:'≈',
  recommended:'Consigliato', offerNow:'Offerta disponibile ora', offerIncludes:'L’offerta include',
  noMatch:'Nessun piatto corrisponde al filtro.', noResults:'Nessun risultato per questa ricerca.',
  emptyMenu:'Questo menu non ha ancora piatti.',
  bannerImage:'Immagine di copertina', openingHours:'Orari di apertura',
  dietary:'Alimentazione', allergenGuide:'Guida agli allergeni',
  allergenGuideSub:'I 14 allergeni che i ristoranti devono dichiarare.',
  filtersSub:'Restringi il menu o consulta la guida agli allergeni.',
  allergyNote:'Segnala sempre al personale un’allergia grave — le cucine condividono le attrezzature.',
  noAllergens:'Nessun allergene dichiarato.',
  displayCurrency:'Valuta visualizzata', displayCurrencySub:'Conversioni approssimative impostate dal ristorante.',
  menuPrice:'Prezzo del menu', approximate:'Approssimativo', youPayIn:'Paghi sempre in',
  changeCurrency:'Cambia valuta visualizzata', all:'Tutti',
  diet_vegetarian:'Vegetariano', diet_vegan:'Vegano', diet_glutenfree:'Senza glutine', diet_halal:'Halal',
  spice_0:'Non piccante', spice_1:'Leggero', spice_2:'Piccante', spice_3:'Molto piccante'
 },
 EL:{
  search:'Αναζήτηση στο μενού', filters:'Φίλτρα', filtersAria:'Φίλτρα και οδηγός αλλεργιογόνων',
  language:'Γλώσσα', currentLanguage:'Τρέχουσα γλώσσα', chooseLanguage:'Επιλέξτε γλώσσα μενού',
  languageSub:'Οι γλώσσες στις οποίες δημοσιεύεται αυτό το μενού.',
  seeDetails:'Δείτε λεπτομέρειες', detailsAria:'Δείτε λεπτομέρειες πιάτου',
  soldOut:'Εξαντλήθηκε', contains:'Περιέχει', containsOne:'Περιέχει',
  item:'πιάτο', items:'πιάτα', from:'από', approx:'≈',
  recommended:'Προτεινόμενο', offerNow:'Διαθέσιμη προσφορά', offerIncludes:'Η προσφορά περιλαμβάνει',
  noMatch:'Κανένα πιάτο δεν ταιριάζει με το φίλτρο.', noResults:'Δεν βρέθηκε τίποτα.',
  emptyMenu:'Αυτό το μενού δεν έχει ακόμη πιάτα.',
  bannerImage:'Εικόνα εξωφύλλου', openingHours:'Ώρες λειτουργίας',
  dietary:'Διατροφή', allergenGuide:'Οδηγός αλλεργιογόνων',
  allergenGuideSub:'Τα 14 αλλεργιογόνα που πρέπει να δηλώνονται.',
  filtersSub:'Περιορίστε το μενού ή δείτε τα αλλεργιογόνα.',
  allergyNote:'Ενημερώνετε πάντα το προσωπικό για σοβαρή αλλεργία — οι κουζίνες μοιράζονται εξοπλισμό.',
  noAllergens:'Δεν δηλώνονται αλλεργιογόνα.',
  displayCurrency:'Νόμισμα εμφάνισης', displayCurrencySub:'Κατά προσέγγιση μετατροπές του εστιατορίου.',
  menuPrice:'Τιμή μενού', approximate:'Κατά προσέγγιση', youPayIn:'Πληρώνετε πάντα σε',
  changeCurrency:'Αλλαγή νομίσματος εμφάνισης', all:'Όλα',
  diet_vegetarian:'Χορτοφαγικό', diet_vegan:'Vegan', diet_glutenfree:'Χωρίς γλουτένη', diet_halal:'Halal',
  spice_0:'Χωρίς καυτερό', spice_1:'Ελαφρύ', spice_2:'Πικάντικο', spice_3:'Πολύ πικάντικο'
 }
};
/* BCP-47 tags so numbers group and separate the way the guest expects. */
const LOCALE_TAGS = {EN:'en-GB',SQ:'sq-AL',IT:'it-IT',EL:'el-GR',DE:'de-DE',FR:'fr-FR',ES:'es-ES',PT:'pt-PT',NL:'nl-NL',PL:'pl-PL',TR:'tr-TR',RO:'ro-RO',SR:'sr-RS',HR:'hr-HR',UK:'uk-UA',SV:'sv-SE',NO:'nb-NO',DA:'da-DK',CS:'cs-CZ',JA:'ja-JP',ZH:'zh-CN',KO:'ko-KR',AR:'ar'};
function guestLangCode(){ return langCodeFor(state.preview.language); }
/* Admin reads English regardless of which language the guest menu is set to. */
function isGuestView(){ return PUBLIC_CTX || state.mode==='preview'; }
function uiLangCode(){ return isGuestView()?guestLangCode():'EN'; }
function numberLocale(){ return LOCALE_TAGS[uiLangCode()]||'en-GB'; }
function t(key,vars){
 const code=uiLangCode();
 const table=UI_STRINGS[code]||UI_STRINGS.EN;
 let out=table[key];
 if(out===undefined) out=UI_STRINGS.EN[key];
 if(out===undefined) return key;
 if(vars) for(const k in vars) out=out.split('{'+k+'}').join(String(vars[k]));
 return out;
}
function dietLabel(id){ const s=t('diet_'+id); return s==='diet_'+id?((DIETS.find(x=>x[0]===id)||[,id])[1]):s; }
function spiceLabel(level){ return t('spice_'+(Number(level)||0)); }
function itemCountLabel(n){ return `${n} ${n===1?t('item'):t('items')}`; }

/* Five genuinely different promotion compositions. Each keeps the price in a
   protected block and works on both light and dark menus. */
const PROMO_STYLES = [
 ['framed','Framed','Brand border, label notched into the edge'],
 ['filled','Filled','Solid brand card, inverted text'],
 ['offer','Offer strip','Footer band with was-price and terms'],
 ['ribbon','Ribbon','Corner ribbon carrying the label'],
 ['editorial','Editorial','Full-bleed image, copy underneath']
];
function promoStyleName(id){ return (PROMO_STYLES.find(s=>s[0]===id)||PROMO_STYLES[0])[1]; }
const PROMO_LABELS = ["Chef's Pick","Tonight's Pick",'Popular','New','House Favourite','Seasonal','Limited','Table deal','Pair & pour'];
const CATEGORY_TINTS = [['brand','Brand'],['sage','Sage'],['sand','Sand'],['clay','Clay'],['night','Night']];
/* Five templates, each a genuinely different layout system rather than a
   colour swap: centred editorial list, magazine columns, dark fine dining,
   bold ink outlines, photo tiles. Old ids fold into the closest survivor. */
const templates = [
 {id:'modern',name:'Aria',sub:'Clean cards, generous air',defaultPalette:'terra',palettes:['terra','clay-sand','olive','coast','slate','indigo'],defaults:{header:'compact',categoryBar:'pill',images:'soft',typography:'mixed',radius:'medium'}},
 {id:'editorial',name:'Gazette',sub:'Magazine columns, serif headings',defaultPalette:'plum',palettes:['plum','terra','forest','slate','ember','noir-gold'],defaults:{header:'centered',categoryBar:'underline',images:'square',typography:'serif',radius:'low'}},
 {id:'noir',name:'Noir',sub:'Dark room, gold accents',defaultPalette:'noir-gold',palettes:['noir-gold','plum','forest','slate','indigo'],defaults:{header:'centered',categoryBar:'underline',images:'soft',typography:'serif',radius:'low'}},
 {id:'street',name:'Bodega',sub:'Ink outlines, sticker energy',defaultPalette:'clay-sand',palettes:['clay-sand','ember','olive','indigo','terra'],defaults:{header:'compact',categoryBar:'pill',images:'square',typography:'bold',radius:'medium'}},
 {id:'grid',name:'Kiosk',sub:'Two-column photo tiles',defaultPalette:'coast',palettes:['coast','terra','ember','forest','slate','plum'],defaults:{header:'minimal',categoryBar:'soft',images:'soft',typography:'mixed',radius:'high'}}
];
const TEMPLATE_ALIASES = {clean:'modern',compact:'modern',coastal:'modern',bistro:'editorial',classy:'editorial',luxury:'noir',market:'noir',imageFirst:'grid'};
function normalizeTemplate(id){
 if(templates.some(t=>t.id===id)) return id;
 return TEMPLATE_ALIASES[id]||'modern';
}
function templateOf(id){ return templates.find(t=>t.id===normalizeTemplate(id))||templates[0]; }

/* ---------------- Palettes ----------------
   Every palette is a primary plus a tinted companion, never a single hue.
   `accent` carries kickers, offer strips and secondary borders; it must stay
   distinct from `brand`. Each palette ships its own dark set — palette × mode
   is a 2D matrix, not one hardcoded dark override. */
const PALETTES = [
 {id:'terra',name:'Terra',
  light:{brand:'#8a543c',accent:'#b07c53',bg:'#fbf6ef',surface:'#fffaf3',text:'#26231f',muted:'#655c53',line:'#e2d7ca'},
  dark:{brand:'#d9a179',accent:'#e8c39c',bg:'#171513',surface:'#211e1a',text:'#f6eee3',muted:'#b3a89c',line:'#3a332c'}},
 {id:'ember',name:'Ember',
  light:{brand:'#a93a26',accent:'#c9773d',bg:'#fdf5f0',surface:'#fffaf6',text:'#241b17',muted:'#685a51',line:'#ecd9cd'},
  dark:{brand:'#f08a68',accent:'#f5b783',bg:'#17110f',surface:'#201917',text:'#f8ece5',muted:'#b8a89f',line:'#3b2f2a'}},
 {id:'olive',name:'Olive',
  light:{brand:'#55643a',accent:'#84925e',bg:'#f7f7ef',surface:'#fdfdf6',text:'#21241b',muted:'#5c6254',line:'#dee2d0'},
  dark:{brand:'#a9bd79',accent:'#cbd7a5',bg:'#14160f',surface:'#1d2016',text:'#eff3e4',muted:'#aab19b',line:'#333829'}},
 {id:'coast',name:'Coast',
  light:{brand:'#265f6b',accent:'#4c848e',bg:'#f2f8f8',surface:'#fbfefe',text:'#17252a',muted:'#4f6266',line:'#d3e3e5'},
  dark:{brand:'#74c0cc',accent:'#a3dbe3',bg:'#0f1618',surface:'#172021',text:'#e6f4f6',muted:'#9db1b4',line:'#2a3739'}},
 {id:'indigo',name:'Indigo',
  light:{brand:'#374680',accent:'#6273ab',bg:'#f4f5fb',surface:'#fcfcff',text:'#1a1e2e',muted:'#565d72',line:'#d9dcec'},
  dark:{brand:'#94a5e0',accent:'#b9c4ef',bg:'#101220',surface:'#191c2c',text:'#e9ebf8',muted:'#a3a9c2',line:'#2c3145'}},
 {id:'plum',name:'Plum',
  light:{brand:'#6a3763',accent:'#96688f',bg:'#faf4f9',surface:'#fffbfe',text:'#241b23',muted:'#645662',line:'#e8d8e5'},
  dark:{brand:'#cf95c6',accent:'#e3b9dc',bg:'#161115',surface:'#1f191e',text:'#f6ebf4',muted:'#b7a7b4',line:'#382e36'}},
 {id:'forest',name:'Forest',
  light:{brand:'#21563e',accent:'#4f846a',bg:'#f1f8f3',surface:'#fbfefc',text:'#16241d',muted:'#4f6058',line:'#d3e5da'},
  dark:{brand:'#7cc39d',accent:'#a9dcc0',bg:'#0e1712',surface:'#16211b',text:'#e7f5ec',muted:'#9db4a6',line:'#29372f'}},
 {id:'slate',name:'Slate',
  light:{brand:'#39434e',accent:'#6b7784',bg:'#f5f6f7',surface:'#fdfdfe',text:'#1c2126',muted:'#59616a',line:'#dcdfe3'},
  dark:{brand:'#a8b4c0',accent:'#c7d0d9',bg:'#111417',surface:'#1a1e22',text:'#edf0f3',muted:'#a4acb4',line:'#2e343a'}},
 {id:'noir-gold',name:'Noir Gold',
  light:{brand:'#7a6030',accent:'#a3884b',bg:'#f7f3ea',surface:'#fffdf7',text:'#211e19',muted:'#635b4e',line:'#e3dbc9'},
  dark:{brand:'#dcbd85',accent:'#f0dcae',bg:'#100f0e',surface:'#191716',text:'#f4ede2',muted:'#a89d8f',line:'#302c27'}},
 {id:'clay-sand',name:'Clay & Sand',
  light:{brand:'#9c4f2b',accent:'#a9762f',bg:'#f4ecdd',surface:'#fffaf0',text:'#26231f',muted:'#645a4c',line:'#ded0b8'},
  dark:{brand:'#e08b52',accent:'#f0bf85',bg:'#1a1713',surface:'#241f19',text:'#f7efe1',muted:'#b8ab98',line:'#3c342a'}}
];
/* Template preview cards each show their own signature palette, so the row
   reads as five looks rather than five layouts of one colour. The selected
   card shows the palette actually in use. */
function paletteFor(tplId,a){
 if(a&&a.template===tplId) return a.palette;
 return templateOf(tplId).defaultPalette;
}
/* The old micro-knobs are no longer owner-facing; they are now the template's
   own defaults, emitted as the same classes the stylesheet already targets. */
function knobClasses(a){
 const r=a.radius==='low'?'low':a.radius==='high'?'high':'medium';
 return `header-${a.header} typography-${a.typography} images-${a.images} radius-${r} category-${a.categoryBar}`;
}
function paletteOf(id){ return PALETTES.find(p=>p.id===id)||PALETTES[0]; }
/* Closest palette to a legacy single hex, by RGB distance to its light brand. */
function hexRgb(h){ const s=String(h||'').replace('#',''); const v=s.length===3?s.split('').map(c=>c+c).join(''):s; const n=parseInt(v,16); return isNaN(n)?[0,0,0]:[(n>>16)&255,(n>>8)&255,n&255]; }
function nearestPalette(hex){
 const [r,g,b]=hexRgb(hex); let best=PALETTES[0], bd=Infinity;
 for(const p of PALETTES){ const [pr,pg,pb]=hexRgb(p.light.brand); const d=(r-pr)**2+(g-pg)**2+(b-pb)**2; if(d<bd){bd=d;best=p;} }
 return {palette:best,distance:Math.sqrt(bd)};
}
/* THE single place palette values enter markup. Nothing else may write a
   --menu-* literal. `custom` derives a full theme from one picked hex so a
   custom colour never collapses into a flat one-colour menu. */
function paletteVars(a,dark){
 const mode=dark?'dark':'light';
 if(a && a.palette==='custom'){
  const b=a.brand||'#8a543c';
  return dark
   ? `--menu-brand:${b};--menu-accent:color-mix(in srgb,${b} 55%,#f4efe8);--menu-bg:color-mix(in srgb,${b} 8%,#141312);--menu-surface:color-mix(in srgb,${b} 11%,#1e1c1a);--menu-text:#f5efe7;--menu-muted:color-mix(in srgb,${b} 18%,#a9a29a);--menu-line:color-mix(in srgb,${b} 22%,#332e29);--brand:${b}`
   : `--menu-brand:${b};--menu-accent:color-mix(in srgb,${b} 62%,#ffffff);--menu-bg:color-mix(in srgb,${b} 5%,#fbf8f4);--menu-surface:color-mix(in srgb,${b} 2%,#ffffff);--menu-text:color-mix(in srgb,${b} 16%,#1d1b19);--menu-muted:color-mix(in srgb,${b} 20%,#5f5850);--menu-line:color-mix(in srgb,${b} 16%,#e2dbd2);--brand:${b}`;
 }
 const p=paletteOf((a&&a.palette)||'terra')[mode];
 return `--menu-brand:${p.brand};--menu-accent:${p.accent};--menu-bg:${p.bg};--menu-surface:${p.surface};--menu-text:${p.text};--menu-muted:${p.muted};--menu-line:${p.line};--brand:${p.brand}`;
}
/* Template switch adopts the template's own defaults, including its palette,
   unless the owner has deliberately picked a custom colour. */
function applyTemplateDefaults(a,tplId){
 const tpl=templateOf(tplId);
 Object.assign(a,tpl.defaults);
 if(a.palette!=='custom') a.palette=tpl.defaultPalette;
 if(a.palette!=='custom') a.brand=paletteOf(a.palette).light.brand;
}



const backgrounds = [['clean','Clean'],['watermark','Watermark'],['geometry','Soft geometry'],['paper','Paper'],['pattern','Pattern'],['gradient','Gradient shadow'],['dark-premium','Dark premium']];

/* ---------------- Allergens, diets, spice ----------------
   EU FIC Annex II — the 14 declarable allergens. Codes are what the guest
   sees as bubbles under a dish; the full names live in the allergen key. */
const ALLERGENS = [
 ['GLU','Cereals containing gluten','Gluten'],['CRU','Crustaceans','Shellfish'],['EGG','Eggs','Egg'],['FIS','Fish','Fish'],
 ['PEA','Peanuts','Peanuts'],['SOY','Soybeans','Soy'],['MIL','Milk','Milk'],['NUT','Tree nuts','Nuts'],
 ['CEL','Celery','Celery'],['MUS','Mustard','Mustard'],['SES','Sesame','Sesame'],['SUL','Sulphites','Sulphites'],
 ['LUP','Lupin','Lupin'],['MOL','Molluscs','Molluscs']
];
/* Allergen wording per guest language: [formal name, short bubble label].
   EN lives in ALLERGENS itself and is the fallback for anything missing. */
const ALLERGENS_I18N = {
 SQ:{GLU:['Drithëra që përmbajnë gluten','Gluten'],CRU:['Krustace','Guaskorë'],EGG:['Vezë','Vezë'],FIS:['Peshk','Peshk'],PEA:['Kikirikë','Kikirikë'],SOY:['Soja','Soja'],MIL:['Qumësht','Qumësht'],NUT:['Arra dhe fruta të thata','Arra'],CEL:['Selino','Selino'],MUS:['Mustardë','Mustardë'],SES:['Susam','Susam'],SUL:['Sulfite','Sulfite'],LUP:['Lupinë','Lupinë'],MOL:['Molusqe','Molusqe']},
 IT:{GLU:['Cereali contenenti glutine','Glutine'],CRU:['Crostacei','Crostacei'],EGG:['Uova','Uova'],FIS:['Pesce','Pesce'],PEA:['Arachidi','Arachidi'],SOY:['Soia','Soia'],MIL:['Latte','Latte'],NUT:['Frutta a guscio','Frutta a guscio'],CEL:['Sedano','Sedano'],MUS:['Senape','Senape'],SES:['Sesamo','Sesamo'],SUL:['Solfiti','Solfiti'],LUP:['Lupini','Lupini'],MOL:['Molluschi','Molluschi']},
 EL:{GLU:['Δημητριακά που περιέχουν γλουτένη','Γλουτένη'],CRU:['Καρκινοειδή','Καρκινοειδή'],EGG:['Αυγά','Αυγά'],FIS:['Ψάρια','Ψάρια'],PEA:['Αραχίδες','Αραχίδες'],SOY:['Σόγια','Σόγια'],MIL:['Γάλα','Γάλα'],NUT:['Ξηροί καρποί','Ξηροί καρποί'],CEL:['Σέλινο','Σέλινο'],MUS:['Μουστάρδα','Μουστάρδα'],SES:['Σουσάμι','Σουσάμι'],SUL:['Θειώδη','Θειώδη'],LUP:['Λούπινο','Λούπινο'],MOL:['Μαλάκια','Μαλάκια']}
};
function allergenEntry(code){
 const base=ALLERGENS.find(x=>x[0]===code)||[code,code,code];
 const tr=(ALLERGENS_I18N[uiLangCode()]||{})[code];
 return tr?[code,tr[0],tr[1]]:base;
}
function allergenLabel(code){ return allergenEntry(code)[2]; }
function allergenFull(code){ return allergenEntry(code)[1]; }
/* Only add the formal name when it actually says something new. */
function allergenHint(code){ const e=allergenEntry(code); return e[1].toLowerCase().startsWith(e[2].toLowerCase())?'':e[1]; }
const DIETS = [['vegetarian','Vegetarian'],['vegan','Vegan'],['glutenfree','Gluten free'],['halal','Halal']];
const DIET_FILTERS = [['all','All'],...DIETS];
function itemAllergens(i){ return Array.isArray(i&&i.allergens)?i.allergens:[]; }
function itemDiets(i){ return Array.isArray(i&&i.dietary)?i.dietary:[]; }

/* ---------------- Translations ----------------
   Stored per language code: item.i18n = {IT:{name,ingredients}},
   category.i18n = {IT:'Antipasti'}. Empty or missing values fall back to
   the restaurant's default language, which is what the guest sees. */
function defaultLangCode(){ return langCodeFor(state.restaurant.defaultLanguage||'English'); }
function menuLanguages(){
 const r=state.restaurant;
 if(!Array.isArray(r.languages)||!r.languages.length) r.languages=[r.defaultLanguage||'English'];
 const def=r.defaultLanguage||'English';
 if(!r.languages.includes(def)) r.languages.unshift(def);
 return r.languages;
}
function extraLanguages(){ const def=state.restaurant.defaultLanguage||'English'; return menuLanguages().filter(l=>l!==def); }
function tItem(i){
 const code=langCodeFor(state.preview.language);
 const base={name:String(i.name||''),ingredients:itemIngredients(i)};
 if(code===defaultLangCode()) return base;
 const tr=(i.i18n||{})[code]||{};
 return {name:String(tr.name||'').trim()||base.name,ingredients:String(tr.ingredients||'').trim()||base.ingredients};
}
function tCategory(c){
 const code=langCodeFor(state.preview.language);
 if(code===defaultLangCode()) return c.name;
 return String(((c.i18n||{})[code])||'').trim()||c.name;
}
function translationStats(langName){
 const code=langCodeFor(langName);
 let total=0,done=0;
 for(const c of state.categories){
  total++; if(String(((c.i18n||{})[code])||'').trim()) done++;
  for(const i of c.items){ total++; if(String((((i.i18n||{})[code])||{}).name||'').trim()) done++; }
 }
 return {total,done,missing:total-done,pct:total?Math.round(done/total*100):0};
}
function missingTranslationCount(){
 return extraLanguages().reduce((sum,l)=>sum+translationStats(l).missing,0);
}
function handleTranslationInput(el){
 const code=el.dataset.trLang, field=el.dataset.trField, id=el.dataset.trId;
 if(!code) return;
 if(el.dataset.trKind==='category'){
  const c=state.categories.find(x=>x.id===id); if(!c) return;
  c.i18n=c.i18n||{}; c.i18n[code]=el.value;
 } else {
  const f=getItem(id); if(!f) return;
  f.item.i18n=f.item.i18n||{}; f.item.i18n[code]=f.item.i18n[code]||{};
  f.item.i18n[code][field||'name']=el.value;
 }
 save();
 const bar=document.getElementById('translation-coverage');
 if(bar){ const st=translationStats(ui.transLang||extraLanguages()[0]); bar.style.width=st.pct+'%'; const label=document.getElementById('translation-coverage-label'); if(label) label.textContent=`${st.done} of ${st.total} translated · ${st.pct}%`; }
}
function toggleMenuLanguage(name){
 const r=state.restaurant; const def=r.defaultLanguage||'English';
 menuLanguages();
 if(name===def){ toast('That is your default language'); return; }
 if(r.languages.includes(name)){ r.languages=r.languages.filter(l=>l!==name); toast(`${name} removed`); }
 else { r.languages.push(name); toast(`${name} added`); }
 if(!r.languages.includes(ui.transLang)) ui.transLang=extraLanguages()[0]||null;
 save(); render();
}
/* Prototype "auto translate": a small built-in dictionary for the demo menu.
   Anything it doesn't know is left empty rather than faked. */
const DEMO_DICTIONARY = {
 IT:{'Popular':'Più richiesti','Starters':'Antipasti','Soups':'Zuppe','Pizza':'Pizza','Pasta':'Pasta','Mains':'Secondi','Desserts':'Dolci','Drinks':'Bevande','Truffle Burger':'Burger al tartufo','Burrata & Tomato':'Burrata e pomodoro','Caesar Salad':'Insalata Caesar','Village Salad':'Insalata del villaggio','Roasted Tomato Soup':'Zuppa di pomodoro arrosto','Margherita':'Margherita','Diavola':'Diavola','Penne Arrabbiata':'Penne all’arrabbiata','Grilled Octopus':'Polpo alla griglia','Grilled Sea Bass':'Branzino alla griglia','Tiramisu':'Tiramisù','Pistachio Cheesecake':'Cheesecake al pistacchio','Citrus Spritz':'Spritz agli agrumi'},
 DE:{'Popular':'Beliebt','Starters':'Vorspeisen','Soups':'Suppen','Pizza':'Pizza','Pasta':'Pasta','Mains':'Hauptgerichte','Desserts':'Desserts','Drinks':'Getränke','Truffle Burger':'Trüffel-Burger','Burrata & Tomato':'Burrata mit Tomate','Caesar Salad':'Caesar Salat','Village Salad':'Bauernsalat','Roasted Tomato Soup':'Geröstete Tomatensuppe','Margherita':'Margherita','Diavola':'Diavola','Penne Arrabbiata':'Penne Arrabbiata','Grilled Octopus':'Gegrillter Oktopus','Grilled Sea Bass':'Gegrillter Wolfsbarsch','Tiramisu':'Tiramisu','Pistachio Cheesecake':'Pistazien-Käsekuchen','Citrus Spritz':'Zitrus-Spritz'},
 SQ:{'Popular':'Më të kërkuarat','Starters':'Antipasta','Soups':'Supa','Pizza':'Pica','Pasta':'Makarona','Mains':'Pjata kryesore','Desserts':'Ëmbëlsira','Drinks':'Pije','Truffle Burger':'Burger me tartuf','Burrata & Tomato':'Burrata me domate','Caesar Salad':'Sallatë Caesar','Village Salad':'Sallatë fshati','Roasted Tomato Soup':'Supë domatesh të pjekura','Margherita':'Margherita','Diavola':'Diavola','Penne Arrabbiata':'Penne Arrabbiata','Grilled Octopus':'Oktapod në skarë','Grilled Sea Bass':'Levrek në skarë','Tiramisu':'Tiramisu','Pistachio Cheesecake':'Çizkejk me fistek','Citrus Spritz':'Spritz me agrume'}
};
function autoTranslate(langName){
 const code=langCodeFor(langName); const dict=DEMO_DICTIONARY[code];
 if(!dict){ toast(`No demo dictionary for ${langName} yet`); return; }
 let filled=0;
 for(const c of state.categories){
  c.i18n=c.i18n||{};
  if(!String(c.i18n[code]||'').trim() && dict[c.name]){ c.i18n[code]=dict[c.name]; filled++; }
  for(const i of c.items){
   i.i18n=i.i18n||{}; i.i18n[code]=i.i18n[code]||{};
   if(!String(i.i18n[code].name||'').trim() && dict[i.name]){ i.i18n[code].name=dict[i.name]; filled++; }
  }
 }
 save(); toast(filled?`${filled} translations filled`:'Nothing left to fill'); render();
}

/* ---------------- Guest analytics ----------------
   Every number on the Insights screen comes from this event log. Nothing is
   invented at render time; an empty log renders an empty state.

   The taxonomy is closed. These seven event types are the only things the
   product claims to observe:

     menu_open, item_view, category_expand, language_change,
     search, filter_allergen, filter_diet
*/
const ANALYTICS_LIMIT = 4000;
const ANALYTICS_TYPES = ['menu_open','item_view','category_expand','language_change','search','filter_allergen','filter_diet'];
const seenItems = new Set();
let guestSession = null;
function analyticsOf(){
 if(!state.analytics||typeof state.analytics!=='object') state.analytics={events:[],seeded:false};
 if(!Array.isArray(state.analytics.events)) state.analytics.events=[];
 return state.analytics;
}
/* Guest analytics count real diners only. The owner flipping into preview or
   opening the admin is not traffic, so nothing is recorded outside a genuine
   public menu session at /menu/<slug>. */
function isGuestTraffic(){ return PUBLIC_CTX; }
function track(type,data={}){
 if(!isGuestTraffic()) return;
 if(!ANALYTICS_TYPES.includes(type)) return;
 const a=analyticsOf();
 a.events.push({type,at:Date.now(),...data});
 if(a.events.length>ANALYTICS_LIMIT) a.events=a.events.slice(-ANALYTICS_LIMIT);
 save();
}
/* Searching fires one event per settled query, not one per keystroke. */
let searchTrackTimer=null;
function trackSearch(q){
 const query=String(q||'').trim();
 clearTimeout(searchTrackTimer);
 if(query.length<2) return;
 searchTrackTimer=setTimeout(()=>track('search',{q:query.toLowerCase()}),900);
}
function startGuestSession(source='preview'){
 seenItems.clear();
 guestSession={start:Date.now()};
 track('menu_open',{source,lang:state.preview.language});
}
function endGuestSession(){ guestSession=null; }
function analyticsEvents(range){
 const events=analyticsOf().events.filter(e=>e&&ANALYTICS_TYPES.includes(e.type));
 if(range==='all') return events;
 const spans={'24h':1,'7d':7,'30d':30};
 const cutoff=Date.now()-(spans[range]||7)*86400000;
 return events.filter(e=>e.at>=cutoff);
}
/* Demo data uses exactly the same taxonomy as real traffic, so nothing on the
   Insights screen exists only for the demo. */
function seedAnalytics(){
 const a=analyticsOf();
 const items=allItems();
 if(!items.length){ toast('Add a dish first'); return; }
 const langs=['English','Italiano','Deutsch','Shqip','Français'];
 const weights=[.42,.2,.16,.14,.08];
 const pickLang=()=>{ let r=Math.random(); for(let i=0;i<langs.length;i++){ r-=weights[i]; if(r<=0) return langs[i]; } return langs[0]; };
 const hourCurve=[1,1,1,1,1,1,2,3,5,7,9,14,18,15,9,7,9,14,20,24,20,12,6,3];
 const totalHourWeight=hourCurve.reduce((s,h)=>s+h,0);
 const pickHour=()=>{ let r=Math.random()*totalHourWeight; for(let h=0;h<24;h++){ r-=hourCurve[h]; if(r<=0) return h; } return 20; };
 const terms=['vegan','byrek','dessert','gluten','wine','salad'];
 for(let d=29;d>=0;d--){
  const visits=8+Math.floor(Math.random()*12);
  for(let v=0;v<visits;v++){
   const day=new Date(); day.setDate(day.getDate()-d); day.setHours(pickHour(),Math.floor(Math.random()*60),0,0);
   const at=day.getTime(); if(at>Date.now()) continue;
   const lang=pickLang();
   a.events.push({type:'menu_open',at,source:Math.random()<.72?'qr':'link',lang});
   if(Math.random()<.28) a.events.push({type:'language_change',at:at+2000,lang});
   const views=1+Math.floor(Math.random()*5);
   for(let k=0;k<views;k++){
    const it=items[Math.floor(Math.random()*Math.min(items.length,8))];
    a.events.push({type:'item_view',at:at+4000+k*3000,id:it.id});
   }
   if(Math.random()<.35&&state.categories.length) a.events.push({type:'category_expand',at:at+9000,id:state.categories[Math.floor(Math.random()*state.categories.length)].id});
   if(Math.random()<.22) a.events.push({type:'search',at:at+11000,q:terms[Math.floor(Math.random()*terms.length)]});
   if(Math.random()<.14) a.events.push({type:'filter_diet',at:at+13000,diet:DIETS[Math.floor(Math.random()*DIETS.length)][0]});
   if(Math.random()<.08) a.events.push({type:'filter_allergen',at:at+14000,code:ALLERGENS[Math.floor(Math.random()*ALLERGENS.length)][0]});
  }
 }
 a.events.sort((x,y)=>x.at-y.at);
 if(a.events.length>ANALYTICS_LIMIT) a.events=a.events.slice(-ANALYTICS_LIMIT);
 a.seeded=true;
 save(); toast('Demo guest data added'); render();
}


/* Toast with an undo affordance. */
function toastUndo(msg,undo){
 toastLayer.innerHTML=`<div class="toast toast-undo"><span>${escapeHtml(msg)}</span><button data-action="undo-toast">Undo</button></div>`;
 clearTimeout(toast._t);
 toastUndo._run=undo;
 toast._t=setTimeout(()=>{ toastLayer.innerHTML=''; toastUndo._run=null; },6000);
}
toastLayer.addEventListener('click',e=>{
 if(e.target.closest('[data-action="undo-toast"]')){
  const run=toastUndo._run; toastUndo._run=null; toastLayer.innerHTML='';
  if(run) run();
 }
});


const TOUR_STEPS = [
 {target:null,title:'Welcome to Hap',body:'Your digital menu is already live. Let’s walk through the five things that matter — it takes about a minute.',cta:'Start tour',nav:{mode:'admin',role:'restaurant',tab:'home'}},
 {target:'status',title:'This is your live status',body:'One glance tells you the menu is published, how many categories are out there and what needs attention tonight.',cta:'Got it',nav:{mode:'admin',tab:'home'}},
 {target:'checklist',title:'Your setup checklist',body:'Anything unfinished lives here. Tick it off and the card disappears — no settings maze.',cta:'Next',nav:{mode:'admin',tab:'home'}},
 {target:'item',title:'Add your first dish',body:'Tap “Add item” to open the one-screen form.',tap:true,nav:{mode:'admin',tab:'home'}},
 {target:'sheet-primary',title:'Save it',body:'Name, price and a photo preset are enough. Tap “Add item” to save.',tap:true},
 {target:'nav-menu',title:'Your whole menu lives here',body:'Tap “Menu” to manage categories, photos and availability.',tap:true},
 {target:'menu-search',title:'Find anything fast',body:'Big menus stay usable: search, filter by sold out, and reorder in place.',cta:'Next'},
 {target:'promote',title:'Promote one dish',body:'Tap “Promote” on any item to make it noticeable on the public menu.',tap:true,nav:{mode:'admin',tab:'menu',expand:'popular'}},
 {target:'sheet-primary',title:'Choose how loud it is',body:'Pick a style and intensity, then save. Only one hero promotion runs at a time so the menu never feels spammy.',tap:true},
  {target:'nav-settings',title:'Style the public menu',body:'Tap “Settings” — Appearance, team and billing all live there.',tap:true},
  {target:'template',title:'Templates apply instantly',body:'Tap Classy, Noir, Market… the public menu restyles the moment you choose.',cta:'Next',nav:{mode:'admin',menuTab:'design'}},
  {target:'nav-menu',title:'Share your QR code',body:'Your menu QR lives under Menu — download or share the code guests scan.',tap:true},

 {target:'preview-toggle',title:'See what guests see',body:'Tap View menu any time to open the real guest menu. That’s the tour — everything else is discoverable.',tap:true}
];

function opsCtx(){
 return {state, ui, icon, escapeHtml, money, platformMoney, formatCurrency, currencyOf, currencyCard, conversionsFor, CURRENCIES, toast, save, render, logActivity, confirm:showConfirm};
}
function showConfirm({title,body,label,tone,run}){
 ui.confirm={title,body,label,tone,run};
 render();
}
function langCodeFor(name){
 const found = languages.find(l => l[1] === name);
 return found ? found[0] : 'EN';
}

/* ---------------- Menu layer ----------------
   A business owns one or more menus; each menu owns its categories. Every
   existing reader still says state.categories, so the active menu is exposed
   through a non-enumerable accessor: one source of truth, no duplicated data
   in localStorage. */
function installMenuLayer(s){
 if(!Array.isArray(s.menus)||!s.menus.length){
  s.menus=[{id:'main',name:'Main Menu',categories:Array.isArray(s.categories)?s.categories:[]}];
 }
 s.menus.forEach((m,idx)=>{
  if(!m.id) m.id='menu-'+(idx+1);
  if(!m.name) m.name='Menu '+(idx+1);
  if(!Array.isArray(m.categories)) m.categories=[];
 });
 if(!s.menus.some(m=>m.id===s.activeMenuId)) s.activeMenuId=s.menus[0].id;
 try{ delete s.categories; }catch(e){}
 Object.defineProperty(s,'categories',{
  configurable:true, enumerable:false,
  get(){ const m=s.menus.find(x=>x.id===s.activeMenuId)||s.menus[0]; return m?m.categories:[]; },
  set(v){ const m=s.menus.find(x=>x.id===s.activeMenuId)||s.menus[0]; if(m) m.categories=Array.isArray(v)?v:[]; }
 });
 return s;
}
/* The single door to persisted domain data for every screen. */
const Services = HapServices.create({getState:()=>state, save:()=>save(), canAccess:key=>canAccess(key), promoStatus:p=>promoStatus(p)});
function menusOf(){ return state.menus||[]; }
function activeMenu(){ return menusOf().find(m=>m.id===state.activeMenuId)||menusOf()[0]; }
function hasMultipleMenus(){ return menusOf().length>1; }
function defaultState(){
 const ops = (window.HapOps && HapOps.defaults) ? HapOps.defaults() : {};
 return installMenuLayer({
  version:14, mode:'admin', role:'restaurant', theme:'light', adminTab:'home', adminSubpage:null,
  analytics:{events:[],seeded:false},
  preview:{language:'English',languageConfirmed:false,promoSeen:false,strongDismissed:false},
  restaurant:{name:'Sofra',city:'Sarandë, Albania',status:'Open',hours:'09:00 – 23:00',phone:'+355 69 123 4567',address:'Rruga Butrinti, Sarandë',instagram:'@sofra.sarande',website:'sofra.al',defaultLanguage:'English',languages:['English','Italiano','Deutsch'],banner:'/hap/assets/banner.jpg',avatar:'/hap/assets/sofra-logo.svg',currency:defaultCurrency(),
   subscription:{status:'active',accessSource:'billing',plan:'hap',startedAt:'2026-03-01',endsAt:'2027-09-01',billingInterval:'monthly',grant:null}},

  invoices:[
   {id:'HAP-2026-08',date:'2026-08-01',amount:2500,status:'Paid'},
   {id:'HAP-2026-07',date:'2026-07-01',amount:2500,status:'Paid'},
   {id:'HAP-2026-06',date:'2026-06-01',amount:2500,status:'Paid'},
   {id:'HAP-2026-05',date:'2026-05-01',amount:2500,status:'Paid'}
  ],
  paymentMethod:{brand:'Visa',last4:'4242',expiry:'09/28'},

  appearance:{template:'modern',palette:'terra',brand:'#8a543c',background:'paper',images:'soft',radius:'medium',categoryBar:'pill',promotionStyle:'framed',typography:'mixed',header:'compact',mode:'light'},
  qrStyle:'brand',
  tour:{active:false,step:0,done:false},
  hideSoldOut:false, qrDownloaded:false,
  activeMenuId:'main',
  menus:[
   {id:'main',name:'Main Menu',categories:[
   {id:'popular',name:'Popular',items:[
    {id:'truffle-burger',name:'Truffle Burger',ingredients:'Beef, truffle cream, onion, aged cheese',price:1250,image:'/hap/assets/truffle-burger.webp',status:'available',allergens:['GLU','MIL','EGG','MUS'],dietary:[],spice:0,promotion:{active:true,intensity:'normal',label:"Chef's Pick",style:'framed',until:'none',wasPrice:null,terms:''}},
    {id:'burrata',name:'Burrata & Tomato',ingredients:'Burrata, tomato, basil oil, sea salt',price:950,image:'/hap/assets/burrata-tomato.webp',status:'available',allergens:['MIL'],dietary:['vegetarian','glutenfree'],spice:0,promotion:{active:true,intensity:'normal',label:'Table deal',style:'offer',until:'tonight',wasPrice:1250,terms:'Today only · 2 plates minimum'}}
   ]},
   {id:'starters',name:'Starters',items:[
    {id:'caesar',name:'Caesar Salad',ingredients:'Romaine, parmesan, sourdough, Caesar dressing',price:750,image:'/hap/assets/caesar-salad.webp',status:'available',allergens:['GLU','MIL','EGG','FIS'],dietary:[],spice:0,promotion:{active:false}},
    {id:'house-salad',name:'Village Salad',ingredients:'Tomato, cucumber, peppers, olives, white cheese',price:650,image:'/hap/assets/house-salad.webp',status:'available',allergens:['MIL'],dietary:['vegetarian','glutenfree'],spice:0,promotion:{active:false}}
   ]},
   {id:'soups',name:'Soups',items:[
    {id:'tomato-soup',name:'Roasted Tomato Soup',ingredients:'Roasted tomato, basil, olive oil, cream',price:550,image:'/hap/assets/tomato-soup.webp',status:'available',allergens:['MIL','CEL'],dietary:['vegetarian'],spice:0,promotion:{active:false}}
   ]},
   {id:'pizza',name:'Pizza',items:[
    {id:'margherita',name:'Margherita',ingredients:'Tomato, mozzarella, basil, olive oil',price:850,image:'/hap/assets/margherita.webp',status:'available',allergens:['GLU','MIL'],dietary:['vegetarian'],spice:0,promotion:{active:false}},
    {id:'diavola',name:'Diavola',ingredients:'Tomato, mozzarella, spicy salami, chilli honey',price:1050,image:'/hap/assets/margherita.webp',status:'soldout',allergens:['GLU','MIL'],dietary:[],spice:2,promotion:{active:false}}
   ]},
   {id:'pasta',name:'Pasta',items:[
    {id:'penne',name:'Penne Arrabbiata',ingredients:'Penne, tomato, garlic, chilli, basil',price:800,image:'/hap/assets/penne-arrabbiata.webp',status:'available',allergens:['GLU'],dietary:['vegetarian','vegan'],spice:2,promotion:{active:false}}
   ]},
   {id:'mains',name:'Mains',items:[
    {id:'octopus',name:'Grilled Octopus',ingredients:'Octopus, lemon, capers, tomato, herbs',price:1450,image:'/hap/assets/grilled-octopus.webp',status:'available',allergens:['MOL','CEL'],dietary:['glutenfree'],spice:0,promotion:{active:false}},
    {id:'sea-bass',name:'Grilled Sea Bass',ingredients:'Sea bass, herb potatoes, greens, lemon butter',price:1750,image:'/hap/assets/sea-bass.webp',status:'available',allergens:['FIS','MIL'],dietary:['glutenfree'],spice:0,promotion:{active:false}}
   ]},
   {id:'desserts',name:'Desserts',promotion:{active:true,label:'Featured tonight',tint:'clay',until:'none'},items:[
    {id:'tiramisu',name:'Tiramisu',ingredients:'Mascarpone, espresso, ladyfingers, cocoa',price:600,image:'/hap/assets/tiramisu.webp',status:'available',allergens:['GLU','MIL','EGG'],dietary:['vegetarian'],spice:0,promotion:{active:false}},
    {id:'pistachio',name:'Pistachio Cheesecake',ingredients:'Cream cheese, pistachio cream, biscuit base',price:650,image:'/hap/assets/pistachio-cheesecake.webp',status:'available',allergens:['GLU','MIL','NUT','EGG'],dietary:['vegetarian'],spice:0,promotion:{active:false}}
   ]},
   {id:'drinks',name:'Drinks',items:[
    {id:'spritz',name:'Citrus Spritz',ingredients:'Orange, tonic, rosemary, fresh citrus',price:500,image:'/hap/assets/burrata-tomato.webp',status:'available',allergens:['SUL'],dietary:['vegetarian','vegan','glutenfree'],spice:0,promotion:{active:false}}
   ]}
   ]},
   {id:'breakfast',name:'Breakfast',categories:[
    {id:'bf-eggs',name:'Eggs & Toast',items:[
     {id:'bf-shakshuka',name:'Shakshuka',ingredients:'Eggs, tomato, peppers, cumin, sourdough',price:720,image:'/hap/assets/tomato-soup.webp',status:'available',allergens:['EGG','GLU'],dietary:['vegetarian'],spice:1,promotion:{active:false}},
     {id:'bf-avocado',name:'Avocado Toast',ingredients:'Sourdough, avocado, chilli flakes, lime',price:680,image:'/hap/assets/house-salad.webp',status:'available',allergens:['GLU'],dietary:['vegetarian','vegan'],spice:1,promotion:{active:false}}
    ]},
    {id:'bf-pastry',name:'Pastries',items:[
     {id:'bf-byrek',name:'Byrek me Spinaq',ingredients:'Filo, spinach, white cheese',price:320,image:'/hap/assets/margherita.webp',status:'available',allergens:['GLU','MIL'],dietary:['vegetarian'],spice:0,promotion:{active:false}}
    ]},
    {id:'bf-coffee',name:'Morning Coffee',items:[
     {id:'bf-latte',name:'Caffè Latte',ingredients:'Espresso, steamed milk',price:0,variants:[{name:'Small',price:220},{name:'Medium',price:280},{name:'Large',price:340}],image:'/hap/assets/tiramisu.webp',status:'available',allergens:['MIL'],dietary:['vegetarian'],spice:0,promotion:{active:false}}
    ]}
   ]},
   {id:'drinks',name:'Drinks',categories:[
    {id:'dr-coffee',name:'Coffee',items:[
     {id:'dr-espresso',name:'Espresso',ingredients:'Single origin, dark roast',price:0,variants:[{name:'Single',price:150},{name:'Double',price:220}],image:'/hap/assets/tiramisu.webp',status:'available',allergens:[],dietary:['vegan'],spice:0,promotion:{active:false}}
    ]},
    {id:'dr-wine',name:'Wine',items:[
     {id:'dr-kallmet',name:'Kallmet Red',ingredients:'Albanian red, Lezhë region',price:0,variants:[{name:'Glass',price:450},{name:'Bottle',price:2200}],image:'/hap/assets/burrata-tomato.webp',status:'available',allergens:['SUL'],dietary:['vegan'],spice:0,promotion:{active:false}},
     {id:'dr-rose',name:'Coastal Rosé',ingredients:'Dry, citrus finish',price:0,variants:[{name:'Glass',price:420},{name:'Bottle',price:2000}],image:'/hap/assets/house-salad.webp',status:'soldout',allergens:['SUL'],dietary:['vegan'],spice:0,promotion:{active:false}}
    ]},
    {id:'dr-soft',name:'Soft Drinks',items:[
     {id:'dr-lemonade',name:'House Lemonade',ingredients:'Lemon, mint, sparkling water',price:300,image:'/hap/assets/house-salad.webp',status:'available',allergens:[],dietary:['vegan','glutenfree'],spice:0,promotion:{active:false}}
    ]}
   ]}
  ],
  superadmin:{restaurants:[
   {id:'sofra',name:'Sofra',owner:'Arben K.',status:'Live',views:'8.4K',languages:12,last:'2 min ago',plan:'Growth',created:'Mar 2026',subscription:{status:'active',accessSource:'billing',plan:'growth',startedAt:'2026-03-01',endsAt:'2027-09-01',billingInterval:'monthly',grant:null}},
   {id:'bella',name:'Bella Napoli',owner:'Elira M.',status:'Live',views:'6.8K',languages:8,last:'14 min ago',plan:'Growth',created:'Feb 2026',subscription:{status:'active',accessSource:'billing',plan:'growth',startedAt:'2026-02-10',endsAt:'2027-02-10',billingInterval:'yearly',grant:null}},
   {id:'marina',name:'Marina',owner:'Jon D.',status:'Live',views:'5.2K',languages:10,last:'31 min ago',plan:'Starter',created:'Jan 2026',subscription:{status:'active',accessSource:'billing',plan:'starter',startedAt:'2026-01-05',endsAt:'2026-11-05',billingInterval:'monthly',grant:null}},
   {id:'kinema',name:'Kinema Bistro',owner:'Sara P.',status:'Draft',views:'1.1K',languages:4,last:'1 h ago',plan:'Starter',created:'Aug 2026',subscription:{status:'trial',accessSource:'trial',plan:'starter',startedAt:'2026-08-12',endsAt:'2026-08-26',billingInterval:null,grant:null}},
   {id:'garden',name:'Garden 21',owner:'Luan B.',status:'Live',views:'3.6K',languages:6,last:'2 h ago',plan:'Scale',created:'Dec 2025',subscription:{status:'active',accessSource:'manual',plan:'scale',startedAt:'2025-12-01',endsAt:null,billingInterval:null,grant:{grantedBy:'Hap Control',grantedAt:'2025-12-01',reason:'Launch partner',duration:'lifetime'}}}
  ]},
  ...ops
 });
}
function migrateV9toV10(parsed){
 /* v9 stored EUR menu prices. Keep the numbers untouched (never silently
    convert a base price) and read them as EUR, with guest rates in EUR terms. */
 parsed.version=10;
 const r=parsed.restaurant||{};
 if(!r.currency) r.currency={primary:'EUR',conversionsEnabled:true,rates:[
  {code:'ALL',rate:0.0102,source:'manual',updatedAt:new Date().toISOString().slice(0,10)}
 ]};
 if(r.subscription) r.subscription.plan='hap';
 (parsed.invoices||[]).forEach(inv=>{ if(inv.amount<1000) inv.amount=2500; });
 return parsed;
}
function migrateV10toV11(parsed){
 const fresh=defaultState();
 parsed.version=11;
 parsed.ops={...fresh.ops,...(parsed.ops||{})};
 parsed.ops.staff=(parsed.ops.staff||fresh.ops.staff).map(s=>{
  const fallback=fresh.ops.staff.find(x=>x.id===s.id);
  return {...s,permissions:s.permissions||(fallback&&fallback.permissions)||{menu:s.role!=='Kitchen',prices:['Owner','Manager'].includes(s.role),promotions:['Owner','Manager'].includes(s.role),design:['Owner','Manager'].includes(s.role),billing:s.role==='Owner',staff:s.role==='Owner'}};
 });
 if(!Array.isArray(parsed.ops.activity)) parsed.ops.activity=fresh.ops.activity;
 parsed.platform={...fresh.platform,...(parsed.platform||{}),plans:fresh.platform.plans,currencies:{...fresh.platform.currencies,...(parsed.platform?.currencies||{})},settings:{...fresh.platform.settings,...(parsed.platform?.settings||{})}};
 delete parsed.platform.settings.maintenance;
 (parsed.superadmin?.restaurants||[]).forEach(r=>{ r.plan='Hap'; if(r.subscription) r.subscription.plan='hap'; });
 return parsed;
}
/* v11 → v12: allergens, dietary tags, spice, per-language translations and the
   guest analytics log. Nothing the restaurant typed is discarded. */
function migrateV11toV12(parsed){
 const fresh=defaultState();
 parsed.version=12;
 if(!parsed.analytics||typeof parsed.analytics!=='object') parsed.analytics={events:[],seeded:false};
 if(!Array.isArray(parsed.analytics.events)) parsed.analytics.events=[];
 const r=parsed.restaurant||(parsed.restaurant={});
 if(!Array.isArray(r.languages)||!r.languages.length) r.languages=[r.defaultLanguage||'English'];
 const seeds={};
 for(const c of fresh.categories) for(const i of c.items) seeds[i.id]=i;
 for(const c of parsed.categories||[]){
  if(!c.i18n||typeof c.i18n!=='object') c.i18n={};
  for(const i of c.items||[]){
   const seed=seeds[i.id]||{};
   if(!Array.isArray(i.allergens)) i.allergens=Array.isArray(seed.allergens)?[...seed.allergens]:[];
   if(!Array.isArray(i.dietary)) i.dietary=Array.isArray(seed.dietary)?[...seed.dietary]:[];
   if(typeof i.spice!=='number') i.spice=Number(seed.spice)||0;
   if(!i.i18n||typeof i.i18n!=='object') i.i18n={};
  }
 }
 return parsed;
}
/* v12 → v13: several promotions may run at once, categories carry their own
   promotion (replacing the single global takeover slot), and item promotions
   gained was-price, terms and an end date. Nothing typed is discarded. */
function migrateV12toV13(parsed){
 parsed.version=13;
 const takeover=parsed.categoryTakeover||null;
 for(const c of parsed.categories||[]){
  if(!c.promotion||typeof c.promotion!=='object'){
   c.promotion=(takeover&&takeover.active&&takeover.categoryId===c.id)
    ? {active:true,label:takeover.label||'Featured tonight',tint:'brand',until:'none'}
    : {active:false};
  }
  for(const i of c.items||[]){
   const p=i.promotion;
   if(!p||typeof p!=='object'){ i.promotion={active:false}; continue; }
   if(!PROMO_STYLES.some(s=>s[0]===p.style)) p.style='framed';
   if(!p.until) p.until='none';
   if(typeof p.wasPrice==='undefined') p.wasPrice=null;
   if(typeof p.terms!=='string') p.terms='';
   if(!p.startedAt) p.startedAt=Date.now();
  }
 }
 delete parsed.categoryTakeover;
 if(parsed.appearance&&!PROMO_STYLES.some(s=>s[0]===parsed.appearance.promotionStyle)) parsed.appearance.promotionStyle='framed';
 return parsed;
}
/* v13 → v14: a business can hold several menus, categories gained
   description / hidden, and items may carry size variants instead of a single
   price. Existing data becomes the first menu; nothing typed is discarded. */
function migrateV13toV14(parsed){
 parsed.version=14;
 installMenuLayer(parsed);
 for(const m of parsed.menus){
  for(const c of m.categories){
   if(typeof c.hidden!=='boolean') c.hidden=false;
   if(typeof c.description!=='string') c.description='';
   if(!c.promotion||typeof c.promotion!=='object') c.promotion={active:false};
   for(const i of c.items||[]){
    if(!Array.isArray(i.variants)) i.variants=[];
    i.variants=i.variants.filter(v=>v&&typeof v==='object').map(v=>({name:String(v.name||'').trim()||'Option',price:Number(v.price)||0}));
    i.price=Number(i.price)||0;
   }
  }
 }
 return parsed;
}
/* Shown instead of a broken-image icon when a dish has no usable photo. */
const FALLBACK_IMAGE = "data:image/svg+xml;utf8," + encodeURIComponent(
 '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#e7ded2"/><g fill="none" stroke="#b3a695" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="48" cy="48" r="20"/><circle cx="48" cy="48" r="9"/></g></svg>'
);
/** Asset paths are absolute, because screens render on any pathname. */
function absoluteAsset(src){
 const s = String(src||'').trim();
 if(!s) return FALLBACK_IMAGE;
 return s.startsWith('assets/') ? '/hap/'+s : s;
}
/** Same as above, but keeps an empty value empty (used when storing). */
function storedAsset(src){
 const s = String(src||'').trim();
 return s ? absoluteAsset(s) : s;
}
/* A photo can disappear after it was saved: the element falls back instead of
   showing the browser's broken-image icon. */
if(typeof document!=='undefined'){
 document.addEventListener('error',e=>{
  const el=e.target;
  if(el && el.tagName==='IMG' && !el.dataset.fallbackApplied){
   el.dataset.fallbackApplied='1';
   el.src=FALLBACK_IMAGE;
  }
 },true);
}

function loadState(){
 try{
  /* One record per restaurant, read through the data service (data.js) so the
     screens never talk to a storage medium directly. */
  let raw = Data.restaurants.read(ACTIVE_SLUG);
  if(raw===null && ACTIVE_SLUG===DEFAULT_SLUG){
   raw = Data.restaurants.migrateLegacy(ACTIVE_SLUG, LEGACY_STORAGE_KEY);
  }
  const parsed=JSON.parse(raw);
  if(!parsed||![9,10,11,12,13,14].includes(parsed.version)) return defaultState();
  if(parsed.version===9) migrateV9toV10(parsed);
  if(parsed.version===10) migrateV10toV11(parsed);
  if(parsed.version===11) migrateV11toV12(parsed);
  migrateV11toV12(parsed); // backfills any field a newer build introduced
  migrateV12toV13(parsed);
  migrateV13toV14(parsed);
  for(const m of parsed.menus){
   for(const c of m.categories){
    for(const i of c.items||[]){
     i.ingredients = String(i.ingredients ?? i.description ?? '').trim();
     i.image = storedAsset(i.image);
     delete i.description; delete i.energy; delete i.portion;
    }
   }
  }
  /* Records written before the application moved into the host document can
     hold asset paths relative to /hap/. */
  if(parsed.restaurant){
   parsed.restaurant.banner = storedAsset(parsed.restaurant.banner);
   parsed.restaurant.avatar = storedAsset(parsed.restaurant.avatar);
  }
  return parsed;
 }catch(e){ return defaultState(); }
}
let state=loadState();
if(state.appearance) normalizeAppearance(state.appearance);
/* Forward-migrates saved appearances written before palettes existed:
   a lone `brand` hex infers the closest palette, and a brand that no longer
   matches its palette means the owner picked their own colour — that wins. */
function normalizeAppearance(a){
 a.template=normalizeTemplate(a.template);
 const tpl=templateOf(a.template);
 delete a.backgroundIntensity; delete a.cards;
 for(const [k,v] of Object.entries(tpl.defaults)) if(!a[k]) a[k]=v;
 if(!a.palette){
  const {palette,distance}=nearestPalette(a.brand);
  a.palette = distance<=40 ? palette.id : 'custom';
  if(a.palette!=='custom') a.brand=palette.light.brand;
 }else if(a.palette!=='custom'&&!PALETTES.some(p=>p.id===a.palette)){
  a.palette=tpl.defaultPalette;
 }
 if(a.palette!=='custom'){
  const primary=paletteOf(a.palette).light.brand;
  if(a.brand&&a.brand.toLowerCase()!==primary.toLowerCase()) a.palette='custom';
  else a.brand=primary;
 }
 return a;
}

let ui={sheet:null,sheetData:null,modal:null,expandedCategory:'popular',menuSearch:'',superSearch:'',languageSearch:'',editingItem:null,adminSearch:'',menuFilter:'all',superFilter:'all',userFilter:'all',subId:null,userSearch:'',confirm:null,skeleton:false,lastFocus:null,hoursOpen:false,dietFilter:'all',displayCurrency:null,transLang:null,
 /* Menu workspace */
 menuCategory:'all', menuSelect:null, menuReorder:false, menuPreview:false, menuError:false, menuLoading:false, menuDirty:false, menuMore:false, itemDraft:null};



function save(){
 /* A guest on the public menu must never write the restaurant's record. Their
    only preferences (language, display currency) live in a guest-scoped key. */
 if(PUBLIC_CTX){ saveGuestPrefs(); return; }
 Data.restaurants.write(ACTIVE_SLUG,state);
}
/* ---------------- Guest-scoped preferences ----------------
   Separate from the restaurant record so the diner's choices are session
   data, not restaurant data. Shape: { language, displayCurrency }. */
function loadGuestPrefs(){ return Data.guest.read(); }
function saveGuestPrefs(){
 Data.guest.write({
  language: state.preview.languageConfirmed?state.preview.language:undefined,
  displayCurrency: ui.displayCurrency||undefined
 });
}
function logActivity(action,entityType,entityName,from=null,to=null){
 const ops=state.ops||(state.ops={}); const staff=ops.staff||[]; const actor=staff.find(s=>s.id===ops.actorId)||staff[0];
 ops.activity=ops.activity||[];
 ops.activity.unshift({id:'a'+Date.now(),restaurantId:'sofra',actorId:actor?.id||'system',actorName:actor?.name||'Restaurant admin',actorRole:actor?.role||'Admin',action,entityType,entityName,from,to,at:new Date().toISOString()});
 ops.activity=ops.activity.slice(0,100);
}
function setTheme(){
 const theme=state.theme||'light'; document.documentElement.dataset.theme=theme; document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#171614':'#f5f1ea');
}
function escapeHtml(v=''){ return String(v).replace(/[&<>'"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s])); }
/* ---------------- currency ----------------
   Two independent systems:
   1. Hap platform billing — always ALL (2,500 Lek / month).
   2. Restaurant menu currency — chosen per restaurant, with optional
      manually configured guest conversions (max 5).
   Item prices have ONE source value, stored in the primary currency. */
const CURRENCIES = {
 ALL:{code:'ALL',name:'Albanian Lek',symbol:'Lek',decimals:0,position:'suffix'},
 EUR:{code:'EUR',name:'Euro',symbol:'€',decimals:2,position:'prefix'}
};
const CURRENCY_CODES = Object.keys(CURRENCIES);
const MAX_GUEST_CURRENCIES = 5;
const PLATFORM_CURRENCY = 'ALL';
const RATE_STALE_DAYS = 30;

function defaultCurrency(){
 return {primary:'ALL',conversionsEnabled:true,rates:[
  {code:'EUR',rate:98,source:'manual',updatedAt:today()}
 ]};
}
function today(){ return new Date().toISOString().slice(0,10); }
function currencyOf(){
 const r=state.restaurant;
 if(!r.currency) r.currency=defaultCurrency();
 if(!CURRENCIES[r.currency.primary]) r.currency.primary='ALL';
 if(!Array.isArray(r.currency.rates)) r.currency.rates=[];
 /* Only supported currencies survive (menu is Lek + Euro). */
 r.currency.rates=r.currency.rates.filter(x=>x&&CURRENCIES[x.code]&&x.code!==r.currency.primary);
 if(ui.displayCurrency&&!CURRENCIES[ui.displayCurrency]) ui.displayCurrency=null;
 return r.currency;
}
/* Decimal-safe: work in integer minor units, round half-up. */
function roundHalfUp(n){ return Math.floor(Number(n)+0.5); }
function formatCurrency(value,code){
 const c=CURRENCIES[code]||CURRENCIES.ALL;
 const minor=roundHalfUp(Math.abs(Number(value)||0)*Math.pow(10,c.decimals));
 const amount=(minor/Math.pow(10,c.decimals)).toLocaleString(numberLocale(),{minimumFractionDigits:c.decimals,maximumFractionDigits:c.decimals});
 const sign=Number(value)<0?'-':'';
 return c.position==='prefix' ? `${sign}${c.symbol}${amount}` : `${sign}${amount} ${c.symbol}`;
}
/* One normalized rate format everywhere: 1 <code> = rate <primary>. */
function convertFromPrimary(basePrice,rate,code){
 const c=CURRENCIES[code]||CURRENCIES.ALL;
 const scale=Math.pow(10,c.decimals);
 const r=Number(rate);
 if(!isFinite(r)||r<=0) return null;
 return roundHalfUp((Number(basePrice)||0)/r*scale)/scale;
}
function guestRates(){
 const cur=currencyOf();
 if(!cur.conversionsEnabled) return [];
 return cur.rates.filter(x=>CURRENCIES[x.code]&&x.code!==cur.primary&&Number(x.rate)>0).slice(0,MAX_GUEST_CURRENCIES);
}
function conversionsFor(basePrice){
 return guestRates().map(r=>({code:r.code,value:convertFromPrimary(basePrice,r.rate,r.code),updatedAt:r.updatedAt}))
  .filter(x=>x.value!==null);
}
function daysSince(iso){
 const d=new Date(iso); if(isNaN(d)) return null;
 return Math.floor((Date.now()-d.getTime())/86400000);
}
function ratesAreStale(){
 const rates=currencyOf().rates;
 if(!rates.length) return false;
 return rates.every(r=>{ const d=daysSince(r.updatedAt); return d===null||d>=RATE_STALE_DAYS; });
}
/* Menu money — restaurant's primary currency. */
function money(v){ return formatCurrency(v,currencyOf().primary); }
/* ---------------- Variants ----------------
   An item has either a single price or an ordered list of variants. The
   effective price used everywhere else is the cheapest variant. */
function itemVariants(i){ return Array.isArray(i&&i.variants)?i.variants.filter(v=>v&&v.name):[]; }
function hasVariants(i){ return itemVariants(i).length>0; }
function itemPrice(i){
 const vs=itemVariants(i);
 if(!vs.length) return Number(i&&i.price)||0;
 return vs.reduce((min,v)=>Math.min(min,Number(v.price)||0),Number(vs[0].price)||0);
}
function itemPriceLabel(i){
 const vs=itemVariants(i);
 return vs.length>1 ? `${t('from')} ${money(itemPrice(i))}` : money(itemPrice(i));
}
/* Platform money — Hap subscription billing, always ALL. */
function platformMoney(v){ return formatCurrency(v,PLATFORM_CURRENCY); }
function getItem(id){ for(const c of state.categories){ const item=c.items.find(i=>i.id===id); if(item) return {item,category:c}; } return null; }
function itemIngredients(i){ return String(i.ingredients ?? i.description ?? '').trim(); }
/* ---------- promotions ----------
   A promotion has a real lifecycle instead of a single boolean:

     scheduled → active ⇄ paused → past

   The status is always derived from the schedule, never stored, so a
   promotion that starts tomorrow or only runs Thu–Sat 17:00–23:00 reports
   the truth without anything having to tick.

   Schedule modes:
     now      — starts immediately, no end
     closing  — starts immediately, ends at the end of today
     schedule — explicit start and end datetimes
     custom   — recurring weekdays plus a daily from/to window
*/
const PROMO_MODES = [['now','Now'],['closing','Until closing'],['schedule','Schedule'],['custom','Custom']];
const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function endOfDay(ts){ const d=new Date(ts); d.setHours(23,59,59,999); return d.getTime(); }
function parseHM(v,fallback){ const m=/^(\d{1,2}):(\d{2})$/.exec(String(v||'')); if(!m) return fallback; return Math.min(23,Number(m[1]))*60+Math.min(59,Number(m[2])); }
/* Local datetime string for <input type="datetime-local"> round-trips. */
function toLocalInput(ts){ const d=new Date(ts); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function fromLocalInput(v){ const t=Date.parse(v); return isNaN(t)?null:t; }
/* Older promotions stored an `until` string; it still resolves to a window. */
function promoWindow(p){
 const start=Number(p.startAt)||Number(p.startedAt)||0;
 let end=(p.endAt===undefined||p.endAt===null)?null:Number(p.endAt);
 if(end===null){
  const until=p.until||'none';
  if(until==='tonight') end=endOfDay(start||Date.now());
  else if(until!=='none'){ const t=Date.parse(until); end=isNaN(t)?null:endOfDay(t); }
 }
 return {start,end};
}
function promoDays(p){ return (Array.isArray(p.days)&&p.days.length)?p.days.map(Number):[0,1,2,3,4,5,6]; }
function inRecurrence(p,now=Date.now()){
 if(p.mode!=='custom') return true;
 const d=new Date(now);
 if(!promoDays(p).includes(d.getDay())) return false;
 const mins=d.getHours()*60+d.getMinutes();
 const from=parseHM(p.from,0), to=parseHM(p.to,1439);
 return from<=to ? (mins>=from&&mins<=to) : (mins>=from||mins<=to);
}
/* 'none' means this entity was never promoted, so it stays out of every list. */
function promoStatus(p){
 if(!p||typeof p!=='object') return 'none';
 if(!p.active) return p.endedAt?'past':'none';
 if(p.pausedAt) return 'paused';
 const now=Date.now();
 const {start,end}=promoWindow(p);
 if(end!==null&&now>end) return 'past';
 if(start&&now<start) return 'scheduled';
 if(!inRecurrence(p,now)) return 'scheduled';
 return 'active';
}
const PROMO_SEGMENTS = [['active','Active'],['scheduled','Scheduled'],['past','Past']];
function promoSegment(p){ const s=promoStatus(p); return s==='paused'?'active':s; }
function isPromoLive(p){ return promoStatus(p)==='active'; }
/* Expired promotions come off the menu on their own, but stay on record so the
   Past segment shows what actually ran. */
function prunePromotions(){
 let changed=false;
 const close=p=>{ if(p&&p.active&&promoStatus(p)==='past'){ p.active=false; p.endedAt=Date.now(); return true; } return false; };
 for(const c of state.categories){
  if(close(c.promotion)) changed=true;
  for(const i of c.items) if(close(i.promotion)) changed=true;
 }
 if(changed) save();
 return changed;
}
/* Every promotion ever created on this menu, whatever its status. */
function allPromotions(){
 const out=[];
 for(const c of state.categories){
  if(promoStatus(c.promotion)!=='none') out.push({kind:'category',category:c,promotion:c.promotion});
  for(const item of c.items) if(promoStatus(item.promotion)!=='none') out.push({kind:'item',item,category:c,promotion:item.promotion});
 }
 return out;
}
function promoRowId(row){ return row.kind==='item'?row.item.id:row.category.id; }
function promoRowName(row){ return row.kind==='item'?row.item.name:row.category.name; }
function promotionsIn(segment){ return allPromotions().filter(r=>promoSegment(r.promotion)===segment); }
function getPromotions(){ return allPromotions().filter(r=>isPromoLive(r.promotion)); }
function itemPromotions(){ return getPromotions().filter(x=>x.kind==='item'); }
function categoryPromotions(){ return getPromotions().filter(x=>x.kind==='category'); }
function isPromotedCategory(c){ return !!(c&&c.promotion&&isPromoLive(c.promotion)); }
/* First live item promotion — the special modal and onboarding still speak
   about a single hero dish. */
function getPromoted(){ const first=itemPromotions()[0]; return first?{item:first.item,category:first.category}:null; }
/* A "strong" promotion owns the guest's attention: a category takeover, or a
   dish set to the strong intensity. Two at once cancel each other out, so the
   second one is refused with a named reason instead of quietly winning. */
function isStrongPromo(p,kind){ return kind==='category' || (p&&p.intensity==='strong'); }
function promoConflict(kind,id,draft){
 if(!isStrongPromo(draft,kind)) return null;
 const clash=getPromotions().find(r=>r.kind===kind&&promoRowId(r)!==id&&isStrongPromo(r.promotion,r.kind));
 return clash?promoRowName(clash):null;
}
function fmtWhen(ts){ return new Date(ts).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); }
function promoEndsLabel(p){
 if(!p||typeof p!=='object') return 'No end date';
 const status=promoStatus(p);
 const {start,end}=promoWindow(p);
 if(p.mode==='custom'){
  const days=promoDays(p).map(d=>DAY_SHORT[d]).join(' ');
  return `${days} · ${p.from||'00:00'}–${p.to||'23:59'}`;
 }
 if(status==='past') return p.endedAt?`Ended ${fmtWhen(p.endedAt)}`:(end?`Ended ${fmtWhen(end)}`:'Ended');
 if(status==='scheduled'&&start&&Date.now()<start) return `Starts ${fmtWhen(start)}`;
 if(end===null) return 'No end date';
 return `Until ${fmtWhen(end)}`;
}
function promoStatusLabel(p){
 const s=promoStatus(p);
 return s==='paused'?'Paused':s==='scheduled'?'Scheduled':s==='past'?'Past':'Live';
}

function toast(msg){ toastLayer.innerHTML=`<div class="toast">${escapeHtml(msg)}</div>`; clearTimeout(toast._t); toast._t=setTimeout(()=>toastLayer.innerHTML='',2200); }

function rememberFocus(btn){ ui.lastFocus = btn; }
function restoreFocus(){
 if(!ui.lastFocus) return;
 if(document.contains(ui.lastFocus)){ ui.lastFocus.focus(); ui.lastFocus=null; return; }
 const d = ui.lastFocus.dataset;
 let selector = `[data-action="${d.action}"]`;
 if(d.tab) selector += `[data-tab="${d.tab}"]`;
 if(d.sheet) selector += `[data-sheet="${d.sheet}"]`;
 if(d.page) selector += `[data-page="${d.page}"]`;
 if(d.id) selector += `[data-id="${d.id}"]`;
 const el = document.querySelector(selector);
 if(el) el.focus();
 ui.lastFocus=null;
}

function prototypeBar(){
 const isLanding=state.mode==='landing';
 const showViewMenu=state.mode==='admin' && state.role!=='super';
 const contextLabel=state.role==='super'?'Hap Control':state.mode==='preview'?'Guest menu':'Hap';
 return \`<div class="prototype-bar">
   \${showViewMenu?\`<button class="proto-view-menu" data-action="view-menu" data-tour="preview-toggle">\${icon('eye',16)}<span>View menu</span></button>\`:\`<div class="proto-brand">\${contextLabel}</div>\`}
   \${isLanding?\`<button class="proto-tool" data-action="go-landing" aria-label="Landing">\${icon('home',18)}</button>\`:\`<button class="proto-tool" data-action="go-landing" aria-label="Back to landing">\${icon('home',18)}</button>\`}
   
   <button class="proto-tool" data-action="theme-toggle" aria-label="Toggle theme">\${icon(state.theme==='dark'?'sun':'moon',18)}</button>
  </div>\`;
}

/* ---------------- Landing ----------------
   One screen, same visual language as the product, so opening the demo feels
   like walking through a door rather than switching sites. */

/* The landing film: a scripted, non-interactive replay of the real admin,
   built from the same dish data, money() formatting and design tokens. */
function demoData(){
 const cat = state.categories.find(c=>c.id==='mains') || state.categories[0];
 const item = (cat.items.find(i=>i.id==='octopus') || cat.items[0]);
 const other = cat.items.find(i=>i!==item) || item;
 return {cat,item,other,oldPrice:item.price+150,newPrice:item.price};
}
function demoRow(i,isTarget,d){
 return `<div class="ld-row${isTarget?' is-target':''}">
  <img src="${escapeHtml(absoluteAsset(i.image))}" alt="" loading="lazy">
  <div class="ld-row-copy"><strong>${escapeHtml(i.name)}</strong><span>Available</span></div>
  <div class="ld-row-price"${isTarget?' data-demo-price="row"':''}>${money(isTarget?d.oldPrice:i.price)}</div>
  ${isTarget?`<span class="ld-row-edit">Edit</span>`:''}
 </div>`;
}
function landingDemo(){
 const d=demoData();
 return `<figure class="landing-demo-wrap">
  <div class="landing-demo" id="landing-demo" data-scene="menu" data-action="open-demo" role="button" tabindex="0" aria-label="Watch the Hap admin demo, then open the live demo">
   <div class="ld-screen">
    <div class="ld-scene ld-admin">
     <div class="ld-bar"><span class="ld-seg"><b class="ld-seg-admin">Admin</b><b class="ld-seg-guest">Preview</b></span><span class="ld-bar-dot"></span></div>
     <div class="ld-head">Menu</div>
     <div class="ld-cat">
      <div class="ld-cat-head"><strong>${escapeHtml(d.cat.name)}</strong><span>${d.cat.items.length} dishes</span><i class="ld-caret">${icon('chevron',13)}</i></div>
      <div class="ld-rows">
       ${demoRow(d.item,true,d)}
       ${demoRow(d.other,false,d)}
      </div>
     </div>
     <div class="ld-cat muted"><div class="ld-cat-head"><strong>Desserts</strong><span>2 dishes</span><i class="ld-caret">${icon('chevron',13)}</i></div></div>
    </div>
    <div class="ld-scene ld-sheet">
     <div class="ld-sheet-handle"></div>
     <div class="ld-sheet-title">Edit item<small>${escapeHtml(d.cat.name)}</small></div>
     <div class="ld-field"><label>Name</label><div class="ld-input">${escapeHtml(d.item.name)}</div></div>
     <div class="ld-field"><label>Price (${escapeHtml(currencyOf().primary)})</label><div class="ld-input ld-input-price" data-demo-price="field">${money(d.oldPrice)}</div></div>
     <div class="ld-save">Save changes</div>
    </div>
    <div class="ld-scene ld-guest">
     <div class="ld-guest-top"><strong>${escapeHtml(state.restaurant.name)}</strong><span>Guest menu · ${escapeHtml(state.preview.language)}</span></div>
     <div class="ld-guest-card">
      <img src="${escapeHtml(d.item.image)}" alt="">
      <div class="ld-guest-copy">
       <strong>${escapeHtml(d.item.name)}</strong>
       <span>${escapeHtml(itemIngredients(d.item))}</span>
       <b data-demo-price="guest">${money(d.newPrice)}</b>
      </div>
     </div>
     <div class="ld-guest-note">${icon('check',13)} Updated a second ago</div>
    </div>
    <div class="ld-toast">${icon('check',13)} Saved</div>
    <div class="ld-cursor" aria-hidden="true"><span class="ld-cursor-ring"></span>${icon('chevron',14)}</div>
   </div>
  </div>
  <figcaption class="landing-demo-caption" id="landing-demo-caption">Edit the menu</figcaption>
  <div class="landing-demo-dots" aria-hidden="true"><i class="on"></i><i></i><i></i></div>
 </figure>`;
}

/* One timeline, one timer, one module-level handle so render() can always
   cancel cleanly and nothing keeps ticking after leaving the landing screen. */
let landingDemoHandle=null;
function stopLandingDemo(){ if(landingDemoHandle){ landingDemoHandle.stop(); landingDemoHandle=null; } }
function startLandingDemo(){
 stopLandingDemo();
 const root=document.getElementById('landing-demo');
 if(!root) return;
 const capEl=document.getElementById('landing-demo-caption');
 const dots=[...root.parentElement.querySelectorAll('.landing-demo-dots i')];
 const cursor=root.querySelector('.ld-cursor');
 const d=demoData();
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

 const steps=[
  {scene:'menu',    cursor:[26,30],            caption:'Edit the menu',           dot:0, hold:1500},
  {scene:'menu',    cursor:[26,30], tap:true,  caption:'Edit the menu',           dot:0, hold:500},
  {scene:'open',    cursor:[26,30],            caption:'Edit the menu',           dot:0, hold:1300},
  {scene:'open',    cursor:[80,45], tap:true,  caption:'Edit the menu',           dot:0, hold:700},
  {scene:'sheet',   cursor:[80,45],            caption:'Change a price',          dot:1, hold:1100},
  {scene:'sheet',   cursor:[34,60], tap:true,  caption:'Change a price',          dot:1, hold:400, tick:true},
  {scene:'sheet',   cursor:[34,60],            caption:'Change a price',          dot:1, hold:1100},
  {scene:'sheet',   cursor:[50,82], tap:true,  caption:'Change a price',          dot:1, hold:600},
  {scene:'saved',   cursor:[50,82],            caption:'Change a price',          dot:1, hold:1500},
  {scene:'saved',   cursor:[64,7],  tap:true,  caption:'Guests see it instantly', dot:2, hold:600},
  {scene:'guest',   cursor:[64,7],             caption:'Guests see it instantly', dot:2, hold:2400},
  {scene:'guest',   cursor:[50,110],           caption:'Live for every table',    dot:2, hold:1800},
  {scene:'menu',    cursor:[50,110],           caption:'Edit the menu',           dot:0, hold:600, reset:true}
 ];

 const h={idx:0,timer:null,tickTimer:null,stopped:false,paused:false,obs:null,onVis:null};
 const priceEls=n=>[...root.querySelectorAll(`[data-demo-price="${n}"]`)];
 const setPrice=(name,v)=>priceEls(name).forEach(el=>{ el.textContent=money(v); });

 function tickPrice(){
  clearInterval(h.tickTimer);
  if(reduce){ setPrice('row',d.newPrice); setPrice('field',d.newPrice); flashPrice(); return; }
  const from=d.oldPrice, to=d.newPrice, frames=14; let f=0;
  h.tickTimer=setInterval(()=>{
   f++;
   const t=f/frames, eased=1-Math.pow(1-t,3);
   const v=Math.round(from+(to-from)*eased);
   setPrice('row',v); setPrice('field',v);
   if(f>=frames){ clearInterval(h.tickTimer); h.tickTimer=null; setPrice('row',to); setPrice('field',to); flashPrice(); }
  },45);
 }
 function flashPrice(){
  priceEls('row').concat(priceEls('field')).forEach(el=>{
   el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash');
  });
 }
 function resetPrices(){
  clearInterval(h.tickTimer); h.tickTimer=null;
  setPrice('row',d.oldPrice); setPrice('field',d.oldPrice); setPrice('guest',d.newPrice);
  priceEls('row').concat(priceEls('field')).forEach(el=>el.classList.remove('is-flash'));
 }

 function apply(step){
  root.dataset.scene=step.scene;
  if(step.reset) resetPrices();
  if(step.tick) tickPrice();
  if(cursor){
   cursor.style.left=step.cursor[0]+'%';
   cursor.style.top=step.cursor[1]+'%';
   cursor.classList.toggle('is-tap',!!step.tap);
  }
  if(capEl && capEl.textContent!==step.caption){
   capEl.classList.add('is-out');
   setTimeout(()=>{ capEl.textContent=step.caption; capEl.classList.remove('is-out'); },160);
  }
  dots.forEach((el,i)=>el.classList.toggle('on',i===step.dot));
 }

 function run(){
  if(h.stopped||h.paused) return;
  if(reduce){ apply(steps[0]); return; }
  const step=steps[h.idx];
  apply(step);
  h.timer=setTimeout(()=>{ h.idx=(h.idx+1)%steps.length; run(); }, reduce ? Math.max(step.hold,1400)*1.35 : step.hold);
 }
 function pause(){ if(h.paused) return; h.paused=true; clearTimeout(h.timer); h.timer=null; clearInterval(h.tickTimer); h.tickTimer=null; }
 function resume(){ if(!h.paused||h.stopped) return; h.paused=false; run(); }

 h.onVis=()=>{ document.hidden ? pause() : resume(); };
 document.addEventListener('visibilitychange',h.onVis);
 if('IntersectionObserver' in window){
  h.obs=new IntersectionObserver(entries=>{ entries.forEach(e=>{ e.isIntersecting ? resume() : pause(); }); },{threshold:.25});
  h.obs.observe(root);
 }
 h.stop=()=>{
  h.stopped=true; clearTimeout(h.timer); clearInterval(h.tickTimer);
  if(h.obs) h.obs.disconnect();
  if(h.onVis) document.removeEventListener('visibilitychange',h.onVis);
 };
 landingDemoHandle=h;
 run();
}

function authSheet(){
 const mode=(ui.sheetData&&ui.sheetData.mode)==='signin'?'signin':'signup';
 const isUp=mode==='signup';
 return sheetShell(isUp?'Create your Hap account':'Welcome back','Prototype only — no account is created and nothing is stored.',
  `<div class="segment-control auth-switch">
    <button class="${isUp?'active':''}" data-action="auth-mode" data-mode="signup">Sign up</button>
    <button class="${!isUp?'active':''}" data-action="auth-mode" data-mode="signin">Sign in</button>
   </div>
   <form id="auth-form" class="form-grid">
    ${isUp?`<div class="field"><label>Restaurant name</label><input name="restaurant" placeholder="Trattoria Vera"></div>`:''}
    <div class="field"><label>Email</label><input name="email" type="email" placeholder="you@restaurant.com"></div>
    <div class="field"><label>Password</label><input name="password" type="password" placeholder="••••••••"></div>
    <button class="btn primary full" type="button" data-action="auth-submit">${isUp?'Create account':'Sign in'} ${icon('chevron',15)}</button>
    <button class="btn full" type="button" data-action="open-demo">Continue as demo restaurant</button>
   </form>`);
}

function landingPage(){
 const plan=HAP_PLAN;
 return `<div class="content-scroll"><main class="admin-main landing">
  <div class="landing-auth-row">
   <button class="btn ghost auth-link" data-action="open-auth" data-mode="signin">Sign in</button>
   <button class="btn primary auth-link" data-action="open-auth" data-mode="signup">Sign up free</button>
  </div>
  <section class="landing-hero">
   <div class="landing-logo">${icon('spark',20)}</div>
   <h1>Your menu, live in minutes</h1>
   <p>Hap turns your dishes into a digital menu guests open by scanning a QR code. Edit a price at 18:00 and the table sees it at 18:01.</p>
   ${landingDemo()}
   <div class="landing-ctas">
    <button class="btn primary full" data-action="open-demo">Open the live demo ${icon('chevron',15)}</button>
    <button class="btn full" data-action="open-guest-menu">${icon('eye',15)} See a guest menu</button>
   </div>
  </section>
  <section class="section"><div class="section-row"><div class="section-title">How it works</div></div>
   <div class="landing-steps">
    <div class="card landing-step"><div class="landing-step-icon">${icon('edit',17)}</div><div><strong>Edit</strong><span>Add dishes, prices, photos and allergens from your phone.</span></div></div>
    <div class="card landing-step"><div class="landing-step-icon">${icon('qr',17)}</div><div><strong>QR</strong><span>Download your code and put it on tables, windows and menus.</span></div></div>
    <div class="card landing-step"><div class="landing-step-icon">${icon('users',17)}</div><div><strong>Guests scan</strong><span>They open the current menu in their own language. No app.</span></div></div>
   </div>
  </section>
  <section class="section"><div class="section-row"><div class="section-title">Pricing</div></div>
   <div class="card landing-plan">
    <div class="landing-plan-head"><div><strong>${escapeHtml(plan.name)}</strong><span>One plan. Everything included.</span></div><div class="landing-price"><b>${platformMoney(plan.price)}</b><small>/ month</small></div></div>
    <ul class="landing-plan-list">
     <li>${icon('check',14)} Unlimited dishes, categories and photos</li>
     <li>${icon('check',14)} QR codes, promotions and menu templates</li>
     <li>${icon('check',14)} Guest insights and multiple languages</li>
     <li>${icon('check',14)} No setup fee, cancel any time</li>
    </ul>
    <button class="btn primary full" data-action="open-demo">Try it in the demo</button>
   </div>
  </section>
  <p class="landing-foot">A working prototype — nothing here is charged.</p>
 </main></div>`;
}


/* A render replaces the scroll containers, which would otherwise reset the
   guest or owner to the top of the page on every tap. The offsets are captured
   before the rebuild and restored right after it. */
let scrollMemory={page:0,sheet:0};
function captureScroll(){
 scrollMemory={
  page:document.querySelector('.content-scroll')?.scrollTop||0,
  sheet:document.querySelector('.sheet')?.scrollTop||0
 };
}
function restoreScroll(){
 const page=document.querySelector('.content-scroll');
 if(page&&scrollMemory.page) page.scrollTop=scrollMemory.page;
 const sheet=document.querySelector('.sheet');
 if(sheet&&scrollMemory.sheet) sheet.scrollTop=scrollMemory.sheet;
}
function render(){
 prunePromotions();
 setTheme();
 stopLandingDemo();
 captureScroll();
 if(PUBLIC_CTX){
  const body = renderPreview();
  app.innerHTML=`<div class="app-stage"><div class="phone-app">${body}${renderOverlays()}</div></div>`;
  postRender();
  return;
 }
 const body = state.mode==='landing' ? landingPage() : (ui.skeleton ? renderSkeleton() : (state.mode==='preview' ? renderPreview() : (state.role==='super'?renderSuperadmin():renderRestaurantAdmin())));
 app.innerHTML=`<div class="app-stage"><div class="phone-app">${prototypeBar()}${body}${renderOverlays()}</div></div>`;
 if(!ui.skeleton){ postRender(); syncPath(); }
}


function renderSkeleton(){
 const inner = `<div class="content-scroll"><main class="admin-main skeleton"><div class="skeleton-head"></div><div class="skeleton-grid"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div><div class="skeleton-list"><div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div></div></main></div>${adminNav()}`;
 return state.role==='super' ? `<div class="super-shell">${inner}</div>` : inner;
}

function renderRestaurantAdmin(){
 const ctx = opsCtx();
 const tabKey = TAB_ACCESS[state.adminTab];
 let page;
 if(state.adminSubpage) page = renderAdminSubpage(state.adminSubpage);
 else if(!canAccess(tabKey)) page = noPermissionPage(tabKey);
 else page = ({home:adminHome,menu:adminMenu,promote:adminPromote,insights:analyticsPage,settings:adminSettingsHub}[state.adminTab]||adminHome)(ctx);
 return `<div class="content-scroll"><main class="admin-main">${page}</main></div>${adminNav()}`;
}
function adminNav(){
 const tabs = state.role==='super'
  ? [['overview','home','Overview'],['restaurants','building','Restaurants'],['users','users','Users'],['plans','chart','Plans'],['settings','settings','Settings']]
  : [['home','home','Overview'],['menu','menu','Menu'],['insights','chart','Insights'],['settings','settings','Settings']];
 const activeTab = state.role==='super' ? state.adminTab : (state.adminSubpage ? ADMIN_SUBPAGES[state.adminSubpage].tab : state.adminTab);
 return `<nav class="admin-bottom-nav" aria-label="${state.role==='super'?'Hap Control':'Restaurant admin'}">${tabs.map(([id,ic,label])=>`<button class="admin-nav-btn ${activeTab===id?'active':''}" data-action="${state.role==='super'?'super-tab':'admin-tab'}" data-tab="${id}" data-tour="nav-${id}"${activeTab===id?' aria-current="page"':''}>${icon(ic,21)}<span>${label}</span></button>`).join('')}</nav>`;
}
/* Reads go through the service boundary, which resolves permission and
   empty states once instead of per screen. */
function allItems(){ const r=Services.items.list(); return r.data||[]; }
function setupTasks(){
 const items=allItems();
 return [
  {id:'items',done:items.length>=6,title:'Add at least 6 dishes',sub:`${items.length} added`,action:'open-add-item'},
  {id:'photos',done:items.every(i=>i.image),title:'Add a photo to every dish',sub:'Photos lift attention by ~30%',action:'admin-tab',tab:'menu'},
  {id:'promo',done:!!getPromoted(),title:'Feature one dish',sub:'One tasteful highlight per service',action:'admin-tab',tab:'promote'},
  {id:'design',done:state.appearance.template!=='modern',title:'Pick a menu template',sub:'Classy, Noir, Market and more',action:'menu-tab',tab:'design'},
  {id:'qr',done:!!state.qrDownloaded,title:'Download your QR',sub:'Ready for print and windows',action:'admin-subpage',page:'qr'}
 ];
}
function adminHome(){
 const promoted=getPromoted();
 const items=allItems();
 const sold=items.filter(i=>i.status==='soldout').length;
 const tasks=setupTasks(); const done=tasks.filter(t=>t.done).length; const pct=Math.round(done/tasks.length*100);
 const hour=new Date().getHours(); const greet=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
 const tonight=weekHours().today;
 const sub=state.restaurant.subscription||{};
 const subStatus=sub.status||'active';
 return `<div class="page-head" data-tour="restaurant"><div><div class="eyebrow">${greet}</div><h1 class="page-title">${escapeHtml(state.restaurant.name)}</h1><p class="page-subtitle">${escapeHtml(state.restaurant.city)}</p><button class="inline-link" data-action="admin-subpage" data-page="restaurant">${icon('clock',13)} Tonight ${escapeHtml(tonight)} · Change hours</button></div><div class="head-actions"><button class="icon-btn" data-action="admin-tab" data-tab="settings" aria-label="Settings">${icon('settings',19)}</button></div></div>
 <button class="plan-chip" data-action="admin-subpage" data-page="billing">${icon('spark',13)} <strong>${escapeHtml(HAP_PLAN.name)}</strong> · ${platformMoney(HAP_PLAN.price)}/mo · ${escapeHtml(subStatus)} ${icon('chevron',13)}</button>
 <div class="card status-card" data-tour="status"><div class="status-orb">${icon('check',20)}</div><div><strong>Your menu is live</strong><span>${state.categories.length} categories · ${items.filter(i=>i.status!=='hidden').length} visible items · ${escapeHtml(state.preview.language)}</span></div><button class="chip-btn" data-action="share-menu">Share</button></div>
 ${done<tasks.length?`<section class="section"><div class="card checklist" data-tour="checklist"><div class="checklist-head"><div><strong>Finish setting up</strong><span>${done} of ${tasks.length} done</span></div><div class="ring" style="--pct:${pct}"><span>${pct}%</span></div></div><div class="checklist-body">${tasks.map(t=>`<button class="check-row ${t.done?'done':''}" data-action="${t.done?'noop':t.action}" ${t.tab?`data-tab="${t.tab}"`:''} ${t.page?`data-page="${t.page}"`:''}><i class="check-box">${t.done?icon('check',12):''}</i><div><strong>${t.title}</strong><span>${t.sub}</span></div>${t.done?'':icon('chevron',15)}</button>`).join('')}</div></div></section>`:''}
 <div class="command-row" role="group" aria-label="Quick actions">
  <button class="command-btn" data-action="open-add-item" data-tour="item"><i>${icon('plus',18)}</i><span>Add dish</span></button>
  <button class="command-btn" data-action="promo-chooser"><i>${icon('spark',18)}</i><span>Promotion</span></button>
  <button class="command-btn" data-action="admin-subpage" data-page="qr"><i>${icon('qr',18)}</i><span>Share QR</span></button>
  <button class="command-btn" data-action="view-menu"><i>${icon('eye',18)}</i><span>Preview</span></button>
 </div>
 <section class="section"><div class="section-row"><div class="section-title">Quick actions</div></div><div class="quick-grid">
  <button class="card quick" data-action="bulk-availability"><div class="quick-icon">${icon('eyeOff',18)}</div><div><strong>Availability</strong><span>Mark dishes sold out</span></div></button>
  <button class="card quick" data-action="bulk-price"><div class="quick-icon">${icon('edit',18)}</div><div><strong>Update prices</strong><span>Every dish, inline</span></div></button>
 </div></section>
 <section class="section"><div class="section-row"><div class="section-title">Service controls</div></div><div class="settings-list">
  <div class="card settings-row"><div class="settings-icon">${icon('clock',18)}</div><div class="settings-copy"><strong>${state.restaurant.status==='Open'?'Open now':'Closed'}</strong><span>Shown at the top of the public menu</span></div><button class="switch ${state.restaurant.status==='Open'?'on':''}" role="switch" aria-checked="${state.restaurant.status==='Open'}" aria-label="Restaurant open" data-action="toggle-open"><i></i></button></div>
  <div class="card settings-row"><div class="settings-icon">${icon('eyeOff',18)}</div><div class="settings-copy"><strong>Hide sold-out dishes</strong><span>Remove them instead of greying them out</span></div><button class="switch ${state.hideSoldOut?'on':''}" role="switch" aria-checked="${!!state.hideSoldOut}" aria-label="Hide sold-out dishes" data-action="toggle-hide-soldout"><i></i></button></div>
 </div></section>
 <section class="section"><div class="section-row"><div class="section-title">Tonight</div><button class="section-link" data-action="admin-tab" data-tab="insights">View insights</button></div><div class="tonight-list">
  <button class="card signal-row" data-action="menu-tab" data-tab="promotions"><div class="signal-icon">${icon('spark',17)}</div><div class="signal-copy"><strong>${promoted?escapeHtml(promoted.item.name):'No active promotion'}</strong><span>${promoted?`${escapeHtml(promoted.item.promotion.label)} · ${escapeHtml(promoted.item.promotion.intensity)}`:'Choose an item to feature'}</span></div><div class="signal-value">${promoted?'1':'0'}</div>${icon('chevron',15)}</button>
  <div class="card signal-row"><div class="signal-icon">${icon('eyeOff',17)}</div><div class="signal-copy"><strong>Sold-out dishes</strong><span>Tap Menu to restock</span></div><div class="signal-value">${sold}</div></div>
 </div></section>`;
}
/* Ordered by what actually happens during a service: add, then the three jobs
   that repeat every night, then find, then the list. */
/* Menu is one workspace with three tabs: the dishes, the look of the public
   menu, and the promotions running on it. */
function menuTabBar(){
 const active=menuTab();
 return `<div class="segment-control menu-tabbar" role="tablist" aria-label="Menu sections">${MENU_TABS.map(([id,label])=>`<button id="menu-tab-${id}" class="${active===id?'active':''}" role="tab" aria-selected="${active===id}" aria-controls="menu-panel" data-action="menu-tab" data-tab="${id}">${label}</button>`).join('')}</div>`;
}
function adminMenu(){
 const tab=menuTab();
 const body = tab==='design' ? (canAccess('design')?appearancePage():noPermissionPage('design'))
  : tab==='promotions' ? adminPromote()
  : adminMenuItems();
 return `${menuTabBar()}<div id="menu-panel" role="tabpanel" aria-labelledby="menu-tab-${tab}">${body}</div>`;
}
function adminMenuItems(){
 const q=(ui.adminSearch||'').trim().toLowerCase();
 const filter=ui.menuFilter||'all';
 const items=allItems();
 const counts={all:items.length,soldout:items.filter(i=>i.status==='soldout').length,hidden:items.filter(i=>i.status==='hidden').length,promoted:items.filter(i=>isPromoLive(i.promotion)).length};
 const cats=state.categories.map(c=>({...c,items:c.items.filter(i=>(!q||(i.name+' '+itemIngredients(i)).toLowerCase().includes(q))&&(filter==='all'||(filter==='soldout'&&i.status==='soldout')||(filter==='hidden'&&i.status==='hidden')||(filter==='promoted'&&isPromoLive(i.promotion))))})).filter(c=>!q&&filter==='all'?true:c.items.length);
 const grid=ui.itemsGrid==='grid';
 return `<div class="page-head"><div><div class="eyebrow">Manage</div><h1 class="page-title">Menu</h1><p class="page-subtitle">${state.categories.length} categories · ${counts.all} dishes${counts.soldout?` · ${counts.soldout} sold out`:''}</p></div><div class="head-actions"><button class="icon-btn" data-action="admin-subpage" data-page="qr" aria-label="Menu QR code">${icon('qr',19)}</button><button class="icon-btn" data-action="add-chooser" data-tour="category" aria-label="Add item or category">${icon('plus',20)}</button></div></div>
 <div class="command-row" role="group" aria-label="Quick actions">
  <button class="command-btn" data-action="bulk-availability"><i>${icon('eyeOff',18)}</i><span>Sold out</span></button>
  <button class="command-btn" data-action="bulk-price"><i>${icon('edit',18)}</i><span>Prices</span></button>
  <button class="command-btn" data-action="promo-chooser"><i>${icon('spark',18)}</i><span>Promote</span></button>
  <button class="command-btn" data-action="admin-subpage" data-page="qr"><i>${icon('qr',18)}</i><span>QR code</span></button>
 </div>
 <label class="search-field" data-tour="menu-search">${icon('search',17)}<input id="admin-search" value="${escapeHtml(ui.adminSearch||'')}" placeholder="Search dishes"></label>
 <div class="items-toolbar">
  <div class="filter-row">${[['all','All'],['soldout','Sold out'],['hidden','Hidden'],['promoted','Promoted']].map(([id,n])=>`<button class="filter-chip ${filter===id?'active':''}" data-action="menu-filter" data-filter="${id}" aria-pressed="${filter===id}">${n}${counts[id]?` <b>${counts[id]}</b>`:''}</button>`).join('')}</div>
  <button class="icon-btn density-btn" data-action="items-density" aria-pressed="${grid}" aria-label="${grid?'Switch to list view':'Switch to compact grid'}">${icon(grid?'menu':'grid',18)}</button>
 </div>
 <div class="cat-strip" role="group" aria-label="Jump to category">${state.categories.map(c=>`<button class="cat-chip ${ui.expandedCategory===c.id?'active':''}" data-action="jump-category" data-id="${c.id}" aria-pressed="${ui.expandedCategory===c.id}">${escapeHtml(c.name)} <b>${c.items.length}</b></button>`).join('')}</div>
 ${cats.map(c=>renderAdminCategory(c)).join('')||'<div class="card empty">Nothing matches that search.</div>'}`;
}

function renderAdminCategory(c){
 const open=ui.expandedCategory===c.id;
 const idx=state.categories.findIndex(x=>x.id===c.id);
 const first=idx<=0, last=idx===state.categories.length-1;
 const featured=isPromotedCategory(c);
 const grid=ui.itemsGrid==='grid';
 return `<div class="card category-admin" id="cat-${c.id}"><div class="category-head-row"><button class="category-head" data-action="toggle-category" data-id="${c.id}"><div class="category-copy"><strong>${escapeHtml(c.name)}${featured?`<span class="cat-badge">${escapeHtml(c.promotion.label||'Featured')}</span>`:''}</strong><span>${c.items.length} items</span></div><span class="mini-icon">${icon(open?'up':'down',15)}</span></button><div class="category-actions"><button class="mini-icon" data-action="promote-category" data-id="${c.id}" aria-label="Promote ${escapeHtml(c.name)}">${icon('spark',14)}</button><button class="mini-icon" data-action="move-category" data-id="${c.id}" data-dir="up" aria-label="Move ${escapeHtml(c.name)} up" ${first?'disabled':''}>${icon('up',14)}</button><button class="mini-icon" data-action="move-category" data-id="${c.id}" data-dir="down" aria-label="Move ${escapeHtml(c.name)} down" ${last?'disabled':''}>${icon('down',14)}</button><button class="mini-icon" data-action="rename-category" data-id="${c.id}" aria-label="Rename ${escapeHtml(c.name)}">${icon('edit',14)}</button><button class="mini-icon danger" data-action="delete-category" data-id="${c.id}" aria-label="Delete ${escapeHtml(c.name)}">${icon('trash',14)}</button></div></div>${open?`<div class="category-body ${grid?'is-grid':''}">${c.items.map(i=>renderAdminItem(i,c)).join('')}<button class="btn small soft add-to-cat" data-action="open-add-item" data-category="${c.id}">${icon('plus',13)} Add to ${escapeHtml(c.name)}</button></div>`:''}</div>`;
}

/* One clean line at 365px: name · status · price, plus inline quick actions
   (price, sold out, hidden) so the common edits never open a sheet. */
function renderAdminItem(i,c){
 const statusLabel=i.status==='available'?'Available':i.status==='soldout'?'Sold out':'Hidden';
 const promoted=isPromoLive(i.promotion);
 const cur=currencyOf();
 return `<div class="admin-item ${i.status==='soldout'?'is-soldout':''} ${i.status==='hidden'?'is-hidden':''}"><img class="admin-item-img" src="${absoluteAsset(i.image)}" alt="${escapeHtml(i.name)}"><div class="admin-item-copy"><strong>${escapeHtml(i.name)}${promoted?'<i class="promo-dot" aria-label="Promoted"></i>':''}</strong><span><i class="status-dot ${i.status}"></i>${statusLabel} · ${itemPriceLabel(i)}</span>
  <div class="item-quick">
   ${i.variants&&i.variants.length?`<button class="quick-pill" data-action="item-actions" data-id="${i.id}">${icon('edit',12)} Variants</button>`:`<label class="quick-price"><span>${escapeHtml(cur.primary)}</span><input inputmode="decimal" data-action="item-price-input" data-id="${i.id}" value="${escapeHtml(String(i.price))}" aria-label="Price for ${escapeHtml(i.name)}"></label>`}
   <button class="quick-pill ${i.status==='soldout'?'on':''}" data-action="item-soldout" data-id="${i.id}" aria-pressed="${i.status==='soldout'}">86</button>
   <button class="quick-pill ${i.status==='hidden'?'on':''}" data-action="item-hidden" data-id="${i.id}" aria-pressed="${i.status==='hidden'}" aria-label="${i.status==='hidden'?`Show ${escapeHtml(i.name)}`:`Hide ${escapeHtml(i.name)}`}">${icon(i.status==='hidden'?'eye':'eyeOff',12)}</button>
  </div>
 </div><button class="mini-icon" data-tour="promote" data-action="item-actions" data-id="${i.id}" aria-label="Actions for ${escapeHtml(i.name)}">${icon('more',16)}</button></div>`;
}
/* One promotions surface, split by lifecycle: Active, Scheduled, Past. Each
   segment owns its empty state, so nothing is implied that is not there. */
function promoRowMarkup(row){
 const p=row.promotion;
 const status=promoStatus(p);
 const id=promoRowId(row);
 const strong=isStrongPromo(p,row.kind);
 const meta=row.kind==='item'
  ? `${escapeHtml(p.label||'Promoted')} · ${escapeHtml(promoStyleName(p.style))}`
  : `Category · ${escapeHtml(p.label||'Featured')}`;
 const actions=[];
 if(status==='active') actions.push(`<button class="btn small soft" data-action="pause-promotion" data-kind="${row.kind}" data-id="${id}">Pause</button>`);
 if(status==='paused') actions.push(`<button class="btn small soft" data-action="resume-promotion" data-kind="${row.kind}" data-id="${id}">Resume</button>`);
 actions.push(`<button class="btn small soft" data-action="promote-${row.kind==='item'?'item':'category'}" data-id="${id}">Edit</button>`);
 if(status!=='past') actions.push(`<button class="btn small" data-action="end-promotion" data-kind="${row.kind}" data-id="${id}">End</button>`);
 const media=row.kind==='item'
  ? `<img src="${absoluteAsset(row.item.image)}" alt="${escapeHtml(row.item.name)}">`
  : `<div class="promo-row-icon">${icon('menu',18)}</div>`;
 return `<div class="card promo-row ${row.kind==='category'?'is-category':''} promo-${status}">${media}<div class="promo-row-copy"><strong>${escapeHtml(promoRowName(row))}</strong><span>${meta} · ${escapeHtml(promoEndsLabel(p))}</span><span class="promo-status">${escapeHtml(promoStatusLabel(p))}${strong?' · Strong':''}</span></div><div class="promo-row-actions">${actions.join('')}</div></div>`;
}
function adminPromote(){
 prunePromotions();
 const segment=PROMO_SEGMENTS.some(s=>s[0]===ui.promoSegment)?ui.promoSegment:'active';
 const rows=promotionsIn(segment);
 const live=getPromotions();
 const itemCount=live.filter(x=>x.kind==='item').length;
 const counts=Object.fromEntries(PROMO_SEGMENTS.map(([id])=>[id,promotionsIn(id).length]));
 const emptyCopy={
  active:'Nothing is running right now. Use “New promotion” to feature a dish or a whole section.',
  scheduled:'Nothing is queued. Give a promotion a start time and it waits here until it opens.',
  past:'No promotion has finished yet. Ended and expired promotions are kept here.'
 };
 return `<div class="page-head"><div><div class="eyebrow">Attention without noise</div><h1 class="page-title">Promote</h1><p class="page-subtitle">${live.length?`${live.length} live`:'Nothing live right now'}</p></div></div>
 <button class="btn primary full" style="margin-bottom:12px" data-action="promo-chooser">${icon('plus',16)} New promotion</button>
 ${ui.promoError?`<div class="promo-warn">${escapeHtml(ui.promoError)}</div>`:''}
 ${itemCount>3?`<div class="promo-warn">${itemCount} promotions active — the menu stops feeling special.</div>`:''}
 <div class="segment-control" role="tablist" aria-label="Promotion status" style="margin-bottom:12px">${PROMO_SEGMENTS.map(([id,label])=>`<button id="promotions-tab-${id}" class="${segment===id?'active':''}" role="tab" aria-selected="${segment===id}" aria-controls="promotions-panel" data-action="promo-segment" data-segment="${id}">${label}${counts[id]?` (${counts[id]})`:''}</button>`).join('')}</div>
 <div id="promotions-panel" role="tabpanel" aria-labelledby="promotions-tab-${segment}">${rows.length?`<div class="promo-manager">${rows.map(promoRowMarkup).join('')}</div>`:`<div class="card empty">${emptyCopy[segment]}</div>`}</div>
 <section class="section"><div class="section-row"><div><div class="section-title">How promotions read</div><div class="page-subtitle">Five compositions. Each one keeps the price protected.</div></div></div><div class="settings-list">${PROMO_STYLES.map(([id,n,desc])=>`<div class="card settings-row"><div class="settings-icon">${icon('spark',17)}</div><div class="settings-copy"><strong>${escapeHtml(n)}</strong><span>${escapeHtml(desc)}</span></div></div>`).join('')}</div></section>`;

}
function tplMini(id){
 return `<div class="tpl-mini template-${id}"><span class="tpl-mini-head">Starters</span>`+
  [1,2].map(()=>`<div class="tpl-mini-row"><i class="tpl-mini-img"></i><div class="tpl-mini-copy"><b></b><s></s></div><em>9.5</em></div>`).join('')+
 `</div>`;
}
function adminQr(){
 return `${subHead('Menu QR','Menu')}
  <div class="page-head"><div><div class="eyebrow">Scan to open</div><h1 class="page-title">Your menu QR</h1><p class="page-subtitle">Ready for windows, counters and print.</p></div></div>
  <div class="card qr-card qr-${state.qrStyle}"><div class="qr-wrap"><canvas id="live-qr" width="360" height="360" aria-label="QR code to this deployed Preview"></canvas></div><div class="qr-title">${escapeHtml(state.restaurant.name)}</div><div class="qr-note">This QR uses the current deployed URL · #preview</div><div class="qr-actions"><button class="btn primary" data-action="download-qr">${icon('download',15)} Download</button><button class="btn" data-action="share-preview">${icon('share',15)} Share</button></div></div>
 <section class="section"><div class="section-row"><div class="section-title">Change design</div></div><div class="preset-scroll">${['simple','brand','counter','window','premium','social'].map(id=>`<button class="preset ${state.qrStyle===id?'selected':''}" data-action="qr-style" data-style="${id}"><div class="preset-preview"><div style="width:42px;height:42px;background:#fff;border:5px solid ${id==='brand'?'var(--brand)':'#ddd'};margin:auto"></div></div><strong>${id[0].toUpperCase()+id.slice(1)}</strong></button>`).join('')}</div></section>`;
}
function adminSettingsHub(){
 const tab=settingsTab();
 const ctx=opsCtx();
 const body = tab==='team' ? (canAccess(SUBPAGE_ACCESS.team)?`<div class="section-row" style="margin-bottom:10px"><div class="section-title">Team</div><button class="btn small soft" data-action="open-sheet" data-sheet="opsStaff">${icon('plus',13)} Invite</button></div>${stripHeads(HapOps.adminPages.staff(ctx))}`:noPermissionPage(SUBPAGE_ACCESS.team))
  : tab==='billing' ? (canAccess(SUBPAGE_ACCESS.billing)?stripHeads(billingPage()):noPermissionPage(SUBPAGE_ACCESS.billing))
  : (canAccess(SUBPAGE_ACCESS.restaurant)?stripHeads(HapOps.adminSubpages.opsSettings(ctx)):noPermissionPage(SUBPAGE_ACCESS.restaurant));
 return `<div class="page-head"><div><div class="eyebrow">Restaurant controls</div><h1 class="page-title">Settings</h1><p class="page-subtitle">Everything else, without turning into a settings maze.</p></div></div>
 <div class="segment-control settings-tabbar" role="tablist" aria-label="Settings sections">${SETTINGS_TABS.map(([id,label])=>`<button id="settings-tab-${id}" class="${tab===id?'active':''}" role="tab" aria-selected="${tab===id}" aria-controls="settings-panel" data-action="settings-tab" data-tab="${id}">${label}</button>`).join('')}</div>
 <div id="settings-panel" role="tabpanel" aria-labelledby="settings-tab-${tab}">${body}</div>
 <section class="section"><div class="section-row"><div class="section-title">Appearance</div></div><div class="settings-list">
  <button class="card settings-row" data-action="menu-tab" data-tab="design"><div class="settings-icon">${icon('palette',18)}</div><div class="settings-copy"><strong>Menu design</strong><span>Template, palette and background</span></div>${icon('chevron',17)}</button>
 </div></section>
 <section class="section"><div class="section-row"><div class="section-title">Prototype tools</div></div><div class="settings-list">
  <button class="card settings-row" data-action="replay-onboarding"><div class="settings-icon">${icon('spark',18)}</div><div class="settings-copy"><strong>Replay onboarding</strong><span>Run the focused 5-step guide</span></div>${icon('chevron',17)}</button>
  <button class="card settings-row" data-action="new-customer"><div class="settings-icon">${icon('eye',18)}</div><div class="settings-copy"><strong>Open as new customer</strong><span>Replay language + promotion flow</span></div>${icon('chevron',17)}</button>
  <button class="card settings-row" data-action="reset-demo"><div class="settings-icon">${icon('refresh',18)}</div><div class="settings-copy"><strong>Reset demo data</strong><span>Restore the original Sofra prototype</span></div>${icon('chevron',17)}</button>
 </div></section>`;
}
function settingsRow(ic,title,sub,page){ return `<button class="card settings-row" data-action="admin-subpage" data-page="${page}"><div class="settings-icon">${icon(ic,18)}</div><div class="settings-copy"><strong>${title}</strong><span>${sub}</span></div>${icon('chevron',17)}</button>`; }
function renderAdminSubpage(page){
 const key = SUBPAGE_ACCESS[page];
 if(!canAccess(key)) return `${subHead(ADMIN_SUBPAGE_TITLES[page]||'Restricted','Settings')}${noPermissionPage(key)}`;
 if(page==='qr') return adminQr();
 if(page==='billing') return billingPage();
 if(page==='team') return HapOps.adminPages.staff(opsCtx());
 if(page==='restaurant') return HapOps.adminSubpages.opsSettings(opsCtx());
 return adminSettingsHub();
}

const ADMIN_SUBPAGE_TITLES = {qr:'QR code',appearance:'Appearance',billing:'Billing',team:'Team',restaurant:'Restaurant'};
function subHead(title,eyebrow=''){ return `<div class="back-row"><button data-action="subpage-back" aria-label="Go back">${icon('back',18)}</button><div><div class="eyebrow">${escapeHtml(eyebrow)}</div><strong>${escapeHtml(title)}</strong></div></div>`; }
/* Live miniature: the real guest-menu renderer drawn at full mobile width
   (390px) inside each card, then shrunk with transform: scale(). No fake
   skeleton — the card shows the actual template with real dishes. */
function templatePreview(id){
 const a=state.appearance;
 const cat=state.categories.find(c=>visibleItemsOf(c).length)||state.categories[0];
 const items=cat?visibleItemsOf(cat).slice(0,2):[];
 const themeClass=state.theme==='dark'?'dark-menu':'';
 return `<div class="preset-preview tpl-live"><div class="tpl-live-page public-root ${themeClass} template-${id} ${knobClasses(templateOf(id).defaults)}" style="${paletteVars({...a,palette:paletteFor(id,a)},state.theme==='dark')};transform:scale(.4)">
  <div class="tpl-live-head"><b>${escapeHtml(state.restaurant.name)}</b><span>${cat?escapeHtml(tCategory(cat)):''}</span></div>
  <div class="product-list">${items.map((i,ii)=>renderPublicItem(i,cat,ii,{static:true})).join('')}</div>
 </div></div>`;
}
/* The inner page is 390px wide; the scale follows the card's rendered width,
   so it stays correct across screen sizes and orientation changes. */
function scaleTemplatePreviews(){
 document.querySelectorAll('.tpl-live').forEach(outer=>{
  const inner=outer.querySelector('.tpl-live-page');
  const w=outer.clientWidth;
  if(!inner||!w) return;
  inner.style.transform=`scale(${w/390})`;
 });
}
window.addEventListener('resize',scaleTemplatePreviews);
/* In-place template selection: toggle classes on the existing cards, move the
   check badge and the dot, update the hero copy — no DOM rebuild, so the
   scroll position survives and scrollIntoView never races a re-render. */
function selectTemplateCard(id){
 const strip=document.querySelector('.template-scroll');
 if(!strip){ render(); return; }
 const cards=[...strip.querySelectorAll('.preset')];
 cards.forEach(card=>{
  const sel=card.dataset.value===id;
  card.classList.toggle('selected',sel);
  card.setAttribute('aria-pressed',String(sel));
  const check=card.querySelector('.preset-check');
  if(sel&&!check) card.querySelector(':scope > strong')?.insertAdjacentHTML('beforeend',`<span class="preset-check">${icon('check',12)}</span>`);
  if(!sel&&check) check.remove();
 });
 const activeIdx=cards.findIndex(c=>c.dataset.value===id);
 document.querySelectorAll('.template-dots i').forEach((d,i)=>d.classList.toggle('active',i===activeIdx));
 const current=templateOf(id);
 const hero=document.querySelector('.appearance-hero');
 if(hero&&current){
  const name=hero.querySelector('strong'), sub=hero.querySelector('span');
  if(name) name.textContent=current.name;
  if(sub) sub.textContent=current.sub;
 }
 refreshPaletteRow();
 refreshBackgroundCards();
 requestAnimationFrame(()=>{
  strip.querySelector('.preset.selected')?.scrollIntoView({behavior:preferredScrollBehavior(),block:'nearest',inline:'center'});
 });
}
/* Shared in-place picker mechanics: no render(), so scroll and focus survive. */
function markPicker(rowSel,value,dotsSel){
 const row=document.querySelector(rowSel);
 if(!row) return null;
 const cards=[...row.querySelectorAll('[data-value]')];
 cards.forEach(card=>{
  const sel=card.dataset.value===value;
  card.classList.toggle('selected',sel);
  card.setAttribute('aria-pressed',String(sel));
 });
 if(dotsSel){
  const idx=cards.findIndex(c=>c.dataset.value===value);
  document.querySelectorAll(`${dotsSel} i`).forEach((d,i)=>d.classList.toggle('active',i===idx));
 }
 return row;
}
/* The palette row is template-scoped, so a template change rebuilds just that
   row's contents in place rather than re-rendering the page. */
function refreshPaletteRow(){
 const row=document.querySelector('.palette-scroll');
 if(row) row.innerHTML=paletteCards();
 const dots=document.querySelector('.palette-dots');
 if(dots) dots.innerHTML=paletteDots();
}
function refreshBackgroundCards(){
 document.querySelectorAll('.background-scroll .preset').forEach(card=>{
  const holder=card.querySelector('.preset-preview');
  if(holder) holder.outerHTML=backgroundPreview(card.dataset.value);
 });
 requestAnimationFrame(scaleTemplatePreviews);
}
/* A real scaled .public-root mini-page, so a background card shows the actual
   pattern under the actual palette instead of a flat swatch. */
function backgroundPreview(id){
 const a=state.appearance;
 const cat=state.categories.find(c=>visibleItemsOf(c).length)||state.categories[0];
 const items=cat?visibleItemsOf(cat).slice(0,1):[];
 return `<div class="preset-preview tpl-live"><div class="tpl-live-page public-root ${state.theme==='dark'?'dark-menu':''} bg-${id} template-${a.template} ${knobClasses(a)}" style="${paletteVars(a,state.theme==='dark')};transform:scale(.4)">
  <div class="tpl-live-head"><b>${escapeHtml(state.restaurant.name)}</b><span>${cat?escapeHtml(tCategory(cat)):''}</span></div>
  <div class="product-list">${items.map((i,ii)=>renderPublicItem(i,cat,ii,{static:true})).join('')}</div>
 </div></div>`;
}
function palettesForTemplate(){
 const tpl=templateOf(state.appearance.template);
 const ids=tpl.palettes&&tpl.palettes.length?tpl.palettes:PALETTES.map(p=>p.id);
 return ids.map(paletteOf);
}
function paletteCards(){
 const a=state.appearance, dark=state.theme==='dark';
 return palettesForTemplate().map(p=>{
  const c=p[dark?'dark':'light'];
  const sel=a.palette===p.id;
  return `<button class="palette-card ${sel?'selected':''}" data-action="palette" data-value="${p.id}" aria-pressed="${sel}" aria-label="${escapeHtml(p.name)} palette">
   <span class="palette-chip" style="--pc-brand:${c.brand};--pc-accent:${c.accent};--pc-bg:${c.bg}">${sel?`<i class="palette-check">${icon('check',12)}</i>`:''}</span>
   <strong>${escapeHtml(p.name)}</strong>
  </button>`;
 }).join('');
}
function paletteDots(){
 const a=state.appearance;
 return palettesForTemplate().map(p=>`<i class="${a.palette===p.id?'active':''}"></i>`).join('');
}
function appearancePage(){
 const a=state.appearance;
 const current=templateOf(a.template);
 return `<div class="page-head"><div><div class="eyebrow">Live editor</div><h1 class="page-title">Design</h1><p class="page-subtitle">Template, palette and background of your public menu.</p></div></div>
 <div class="appearance-hero card">
  <div><div class="eyebrow">Current style</div><strong>${escapeHtml(current.name)}</strong><span>${escapeHtml(current.sub)}</span></div>
  <button class="btn small primary" data-action="open-guest-menu">${icon('eye',14)} Preview</button>
 </div>
 <div class="appearance-group" data-tour="template"><label>Menu style</label><div class="preset-scroll template-scroll">${templates.map(t=>`<button class="preset ${a.template===t.id?'selected':''}" data-action="appearance" data-key="template" data-value="${t.id}" aria-pressed="${a.template===t.id}">${templatePreview(t.id)}<strong>${escapeHtml(t.name)}${a.template===t.id?`<span class="preset-check">${icon('check',12)}</span>`:''}</strong><small>${escapeHtml(t.sub)}</small></button>`).join('')}</div><div class="template-dots" aria-hidden="true">${templates.map(t=>`<i class="${a.template===t.id?'active':''}"></i>`).join('')}</div></div>
 <div class="appearance-group"><label>Palette</label><div class="preset-scroll palette-scroll">${paletteCards()}</div><div class="template-dots palette-dots" aria-hidden="true">${paletteDots()}</div>
  <div class="color-row custom-color-row"><input class="color-input" type="color" value="${a.brand}" data-action="brand-custom" aria-label="Custom brand colour"><span class="custom-color-note">${a.palette==='custom'?'Custom colour in use':'Or pick your own colour'}</span></div></div>
 <div class="appearance-group"><label>Background</label><div class="preset-scroll background-scroll">${backgrounds.map(([id,name])=>`<button class="preset ${a.background===id?'selected':''}" data-action="background" data-value="${id}" aria-pressed="${a.background===id}">${backgroundPreview(id)}<strong>${escapeHtml(name)}</strong></button>`).join('')}</div></div>
 <div class="appearance-group"><label>Mode</label><div class="segment-control"><button class="${state.theme==='light'?'active':''}" data-action="set-theme" data-theme="light">Light</button><button class="${state.theme==='dark'?'active':''}" data-action="set-theme" data-theme="dark">Dark</button></div></div>`;

}

/* ---------------- Billing ---------------- */
const HAP_PLAN = {id:'hap',name:'Hap',price:2500,currency:'ALL',interval:'monthly'};
const PLAN_LABELS = {hap:'Hap',starter:'Hap',growth:'Hap',scale:'Hap'};
const PLAN_PRICES = {hap:HAP_PLAN.price,starter:HAP_PLAN.price,growth:HAP_PLAN.price,scale:HAP_PLAN.price};
function formatDay(iso){
 if(!iso) return 'No end date';
 const d=new Date(iso); if(isNaN(d)) return iso;
 return d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
}
function subscriptionOf(){
 if(!state.restaurant.subscription) state.restaurant.subscription={status:'trial',accessSource:'trial',plan:'starter',startedAt:new Date().toISOString().slice(0,10),endsAt:null,billingInterval:null,grant:null};
 return state.restaurant.subscription;
}
function accessLabel(sub){
 if(sub.accessSource==='manual') return 'Access granted by Hap';
 if(sub.accessSource==='trial') return 'Free trial';
 return sub.billingInterval==='yearly' ? 'Billed yearly' : 'Billed monthly';
}
function billingPage(){
 const sub=subscriptionOf();
 const plan=PLAN_LABELS[sub.plan]||'Starter';
 const price=PLAN_PRICES[sub.plan]||19;
 const statusTone = sub.status==='active' ? 'ok' : (sub.status==='trial' ? 'warn' : 'bad');
 return `${subHead('Billing','Plan and payments')}
 <div class="card" style="padding:16px">
  <div class="section-row" style="margin-bottom:8px"><div><div class="eyebrow">Current plan</div><strong style="font-size:20px;letter-spacing:-.02em">${plan}</strong></div><span class="status-pill tone-${statusTone}">${escapeHtml(sub.status)}</span></div>
  <p class="page-subtitle" style="margin:0;font-weight:750">${platformMoney(price)} / month · billed in Albanian Lek</p>
  <p class="page-subtitle" style="margin:4px 0 0">${sub.endsAt?`Active until ${formatDay(sub.endsAt)}`:'Lifetime access — no end date'} · ${accessLabel(sub)}</p>
  ${sub.accessSource==='manual'&&sub.grant?`<p class="page-subtitle" style="margin:6px 0 0">Granted by ${escapeHtml(sub.grant.grantedBy)} on ${formatDay(sub.grant.grantedAt)}${sub.grant.reason?` · ${escapeHtml(sub.grant.reason)}`:''}</p>`:''}
 </div>
 <div class="card" style="padding:16px;margin-top:12px">
  <div class="eyebrow">Coming soon</div>
  <strong style="font-size:15px;display:block;margin-top:4px">Self-serve billing</strong>
  <p class="page-subtitle" style="margin:5px 0 0">Changing plans, managing your subscription, payment methods and invoices will arrive once a payment provider is connected. For now, plan changes are handled by the Hap team.</p>
 </div>
 <p class="page-subtitle" style="text-align:center;margin:14px 0 4px">Prototype billing — no payment provider is connected yet.</p>`;
}
const INSIGHT_RANGES=[['24h','24 hours'],['7d','7 days'],['30d','30 days'],['all','All time']];
function fmtCount(n){ return n.toLocaleString('en-GB'); }
function fmtDuration(ms){
 if(!ms||ms<1000) return '0:00';
 const m=Math.floor(ms/60000), s=Math.floor((ms%60000)/1000);
 return `${m}:${s.toString().padStart(2,'0')}`;
}
/* Only directly observed counts appear here. No revenue, no conversion, no
   inferred "time on menu" — the prototype does not measure those, so it does
   not claim them. */
function analyticsPage(){
 const range=ui.insightsRange||'7d';
 const res=Services.insights.summary(range);
 const s=res.data||{};
 const events=s.events||[];
 const opens=events.filter(e=>e.type==='menu_open');
 const scans=opens.filter(e=>e.source==='qr').length;
 const links=opens.filter(e=>e.source==='link').length;
 const views=opens.length;
 const totalLang=(s.languages||[]).reduce((a,[,n])=>a+n,0)||1;
 const langRows=(s.languages||[]).slice(0,5).map(([name,n])=>{
  const code=langCodeFor(name);
  const l=languages.find(x=>x[0]===code);
  return [l?l[2]:name, n, Math.round(n/totalLang*100)];
 });
 const topItems=(s.topItems||[]).map(([id,n])=>[allItems().find(i=>i.id===id),n]).filter(([it])=>it);
 const maxItemViews=Math.max(1,...topItems.map(([,n])=>n));
 const hours=new Array(14).fill(0);
 for(const e of opens){ const h=new Date(e.at).getHours(); const bucket=Math.min(13,Math.max(0,Math.floor((h-8)/1.15))); hours[bucket]++; }
 const maxHour=Math.max(1,...hours);
 const hourLabels=['10:00','16:00','23:00'];
 const head = state.adminSubpage
  ? subHead('Insights','Observed guest activity')
  : `<div class="page-head"><div><div class="eyebrow">${range==='all'?'All time':'Last '+(INSIGHT_RANGES.find(r=>r[0]===range)||[,'7 days'])[1]}</div><h1 class="page-title">Insights</h1><p class="page-subtitle">What guests actually did on your menu</p></div></div>`;
 const ranges=`<div class="range-chips" role="group" aria-label="Date range">${INSIGHT_RANGES.map(([id,label])=>`<button class="filter-chip ${range===id?'active':''}" data-action="insights-range" data-range="${id}" aria-pressed="${range===id}">${label}</button>`).join('')}</div>`;
 const tab=insightsTab();
 const tabbar=`<div class="segment-control insights-tabbar" role="tablist" aria-label="Insight sections">${INSIGHT_TABS.map(([id,label])=>`<button id="insights-tab-${id}" class="${tab===id?'active':''}" role="tab" aria-selected="${tab===id}" aria-controls="insights-panel" data-action="insights-tab" data-tab="${id}">${label}</button>`).join('')}</div>`;
 if(res.status==='denied') return `${head}${noPermissionPage('menu')}`;
 if(res.status!=='ok'||!events.length){
  return `${head}${ranges}
   <div class="card empty" style="padding:28px 16px;text-align:center"><strong>No guest activity in this period</strong><p style="color:var(--muted);margin:8px 0 16px">Insights only count real guests opening <code>/menu/${escapeHtml(menuSlug())}</code>. Your own previews are never recorded.</p><button class="btn primary" data-action="seed-analytics">Seed demo data</button></div>`;
 }
 const bars = rows => rows.length
  ? rows.map(([label,count,pct])=>`<div class="bar-row"><div class="bar-label"><span>${escapeHtml(label)}</span><span>${fmtCount(count)}</span></div><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div>`).join('')
  : `<div class="empty-inline">Nothing recorded yet.</div>`;
 const traffic = `<div class="stat-grid">
  <div class="card stat"><span>Menu opens</span><strong>${fmtCount(s.opens||0)}</strong><em class="stat-delta">${scans} QR · ${links} link</em></div>
  <div class="card stat"><span>Dish views</span><strong>${fmtCount(s.itemViews||0)}</strong><em class="stat-delta">${topItems.length} dishes seen</em></div>
  <div class="card stat"><span>Searches</span><strong>${fmtCount(s.searches||0)}</strong><em class="stat-delta">${(s.topSearches||[]).length} distinct terms</em></div>
  <div class="card stat"><span>Category opens</span><strong>${fmtCount(s.categoryExpands||0)}</strong><em class="stat-delta">${fmtCount(s.languageChanges||0)} language switches</em></div>
 </div>
 <section class="section"><div class="section-title" style="margin-bottom:10px">Menu opens by hour</div><div class="card" style="padding:14px"><div class="spark">${hours.map(h=>`<i style="height:${Math.max(4,Math.round(h/maxHour*92))}%" class="${h===maxHour?'peak':''}"></i>`).join('')}</div><div class="spark-axis">${hourLabels.map(l=>`<span>${l}</span>`).join('')}</div></div></section>`;
 const dishes = `<section class="section"><div class="section-title" style="margin-bottom:10px">Most viewed dishes</div><div class="card bar-list">${bars(topItems.map(([it,n])=>[it.name,n,Math.round(n/maxItemViews*100)]))}</div></section>
 <section class="section"><div class="section-title" style="margin-bottom:10px">Top search terms</div><div class="card bar-list">${bars((s.topSearches||[]).map(([q,n],i,arr)=>[q,n,Math.round(n/arr[0][1]*100)]))}</div></section>`;
 const guests = `<section class="section"><div class="section-title" style="margin-bottom:10px">Guest languages</div><div class="card bar-list">${bars(langRows.map(([n,c,pct])=>[n,c,pct]))}</div></section>
 <section class="section"><div class="section-title" style="margin-bottom:10px">Filters used</div><div class="card bar-list">${bars([...(s.dietFilters||[]).map(([d,n])=>[dietLabel(d),n,100]),...(s.allergenFilters||[]).map(([c,n])=>[allergenFull(c),n,100])].map((r,_,arr)=>{const max=Math.max(...arr.map(x=>x[1]));return [r[0],r[1],Math.round(r[1]/max*100)];}))}</div></section>`;
 return `${head}${tabbar}${ranges}
 <div id="insights-panel" role="tabpanel" aria-labelledby="insights-tab-${tab}">${tab==='dishes'?dishes:tab==='guests'?guests:traffic}</div>
 <p class="fx-note">Counts come only from guest sessions on your public menu. Owner previews are excluded.</p>`;
}

/* ---------------- Menu currency settings (lives inside Settings) ---------------- */
function samplePrice(){
 const first=allItems().find(i=>Number(i.price)>0);
 return first?Number(first.price):1000;
}
function currencyOption(code,selected){
 const c=CURRENCIES[code];
 return `<option value="${code}" ${selected?'selected':''}>${code} — ${c.name}</option>`;
}
function conversionPreviewText(){
 const base=samplePrice();
 const list=conversionsFor(base);
 if(!list.length) return 'Add a currency to see a converted example.';
 return `${money(base)} ≈ ${list.map(x=>formatCurrency(x.value,x.code)).join(' · ')}`;
}
function rateRow(r,idx,total){
 const cur=currencyOf();
 const c=CURRENCIES[r.code];
 const days=daysSince(r.updatedAt);
 return `<div class="rate-row">
  <div class="rate-head"><span class="rate-code">${r.code}</span><span class="rate-name">${escapeHtml(c?c.name:r.code)}</span>
   <div class="rate-tools">
    <button class="mini-icon" data-action="move-rate" data-code="${r.code}" data-dir="up" ${idx===0?'disabled':''} aria-label="Move ${r.code} up">${icon('up',13)}</button>
    <button class="mini-icon" data-action="move-rate" data-code="${r.code}" data-dir="down" ${idx===total-1?'disabled':''} aria-label="Move ${r.code} down">${icon('down',13)}</button>
    <button class="mini-icon" data-action="remove-rate" data-code="${r.code}" aria-label="Remove ${r.code}">${icon('close',13)}</button>
   </div>
  </div>
  <div class="rate-equation"><span>1 ${r.code} =</span><input inputmode="decimal" data-rate="${r.code}" value="${escapeHtml(String(r.rate))}" aria-label="Rate for 1 ${r.code} in ${cur.primary}"><span>${cur.primary}</span></div>
  <div class="rate-foot"><span id="rate-updated-${r.code}">Last updated: ${r.updatedAt?formatDay(r.updatedAt):'never'}${days!==null&&days>=RATE_STALE_DAYS?' · not reviewed recently':''}</span><span class="rate-error" id="rate-error-${r.code}"></span></div>
 </div>`;
}
function currencyCard(){
 const cur=currencyOf();
 const rates=cur.rates.filter(r=>CURRENCIES[r.code]);
 const available=CURRENCY_CODES.filter(c=>c!==cur.primary&&!rates.some(r=>r.code===c));
 const full=rates.length>=MAX_GUEST_CURRENCIES;
 return `<section class="section"><div class="section-row"><div><div class="section-title">Menu currency</div><div class="page-subtitle">What guests see beside every dish.</div></div></div>
 <div class="card form-card">
  <div class="field"><label for="cur-primary">Primary currency</label>
   <select id="cur-primary" data-action="set-primary-currency">${CURRENCY_CODES.map(c=>currencyOption(c,c===cur.primary)).join('')}</select></div>
  <p class="page-subtitle" style="margin:0">Prices are stored once, in this currency. Changing it never rewrites your numbers — they are simply read as the new currency, so review them afterwards.</p>
 </div>
 </section>
 <section class="section"><div class="section-row"><div><div class="section-title">Guest currency conversions</div><div class="page-subtitle">Optional, approximate reference prices.</div></div></div>
 <div class="card settings-row"><div class="settings-copy"><strong>Enable currency conversion</strong><span>Guests can reveal converted prices on the menu</span></div>
  <button class="switch ${cur.conversionsEnabled?'on':''}" role="switch" aria-checked="${!!cur.conversionsEnabled}" aria-label="Enable currency conversion" data-action="toggle-conversions"><i></i></button></div>
 ${cur.conversionsEnabled?`
 <div class="card form-card" style="margin-top:9px">
  ${rates.length?rates.map((r,i)=>rateRow(r,i,rates.length)).join(''):`<div class="empty-inline">No guest currencies yet. Add one below.</div>`}
  ${full?`<p class="page-subtitle" style="margin:2px 0 0">Maximum of ${MAX_GUEST_CURRENCIES} guest currencies reached.</p>`:`
  <div class="rate-add">
   <select id="cur-add" aria-label="Currency to add">${available.map(c=>currencyOption(c,false)).join('')}</select>
   <button class="btn soft" data-action="add-rate">${icon('plus',14)} Add currency</button>
  </div>`}
  <div class="rate-preview"><span class="eyebrow">Preview conversion</span><strong id="rate-preview-text">${escapeHtml(conversionPreviewText())}</strong></div>
  ${ratesAreStale()?`<p class="rate-stale">${icon('clock',13)} Exchange rates haven’t been reviewed recently.</p>`:''}
 </div>`:''}
 </section>`;
}
function refreshCurrencyPreview(){
 const el=document.getElementById('rate-preview-text');
 if(el) el.textContent=conversionPreviewText();
}
function handleRateInput(input){
 const code=input.dataset.rate;
 const cur=currencyOf();
 const entry=cur.rates.find(r=>r.code===code);
 if(!entry) return;
 const err=document.getElementById('rate-error-'+code);
 const raw=String(input.value||'').trim().replace(',','.');
 const num=Number(raw);
 const setErr=msg=>{ if(err) err.textContent=msg; input.classList.toggle('invalid',!!msg); };
 if(raw==='' || !/^\d*\.?\d*$/.test(raw) || !isFinite(num)){ setErr('Enter a number'); return; }
 if(num<=0){ setErr('Rate must be above zero'); return; }
 setErr('');
 entry.rate=num; entry.source='manual'; entry.updatedAt=today();
 logActivity('Updated exchange rate','currency',code,null,`${num} ${cur.primary}`);
 save();
 const upd=document.getElementById('rate-updated-'+code);
 if(upd) upd.textContent=`Last updated: ${formatDay(entry.updatedAt)}`;
 refreshCurrencyPreview();
}
function setPrimaryCurrency(code){
 if(!CURRENCIES[code]) return;
 const cur=currencyOf();
 if(cur.primary===code) return;
 const previous=cur.primary;
 showConfirm({title:`Change primary currency to ${code}?`,body:`Existing numeric prices will stay unchanged and be read as ${code}. Review every menu price after changing from ${previous}.`,label:'Change currency',run(){
  cur.primary=code; cur.rates=cur.rates.filter(r=>r.code!==code);
  logActivity('Changed primary currency','currency','Menu currency',previous,code);
  save(); render(); toast(`Prices are now read as ${code} — review them`);
 }});
}
function addGuestCurrency(){
 const cur=currencyOf();
 const sel=document.getElementById('cur-add');
 const code=sel?sel.value:'';
 if(!CURRENCIES[code]){ toast('Pick a currency first'); return; }
 if(code===cur.primary){ toast('That is already your primary currency'); return; }
 if(cur.rates.some(r=>r.code===code)){ toast(`${code} is already enabled`); return; }
 if(cur.rates.length>=MAX_GUEST_CURRENCIES){ toast(`Maximum ${MAX_GUEST_CURRENCIES} guest currencies`); return; }
 cur.rates.push({code,rate:1,source:'manual',updatedAt:today()});
 save(); toast(`${code} added — set its rate`); render();
}

function weekHours(){
 const fallback=[['Monday',state.restaurant.hours],['Tuesday',state.restaurant.hours],['Wednesday',state.restaurant.hours],['Thursday',state.restaurant.hours],['Friday',state.restaurant.hours],['Saturday',state.restaurant.hours],['Sunday',state.restaurant.hours]];
 const list=(state.ops&&Array.isArray(state.ops.hours)&&state.ops.hours.length)?state.ops.hours:fallback;
 const todayIndex=(new Date().getDay()+6)%7;
 return {list,todayIndex,today:(list[todayIndex]||[])[1]||state.restaurant.hours};
}
function hoursDisclosure(){
 const {list,todayIndex,today}=weekHours();
 const open=!!ui.hoursOpen;
 return `<div class="hours-disclosure ${open?'open':''}">
  <button class="hours-trigger" data-action="toggle-hours" aria-expanded="${open}" aria-controls="hours-panel">${icon('clock',13)}<span>${escapeHtml(today)}</span>${icon(open?'up':'down',13)}</button>
  <div class="hours-panel" id="hours-panel" ${open?'':'hidden'}>
   <div class="hours-panel-head">${icon('calendar',14)} ${escapeHtml(t('openingHours'))}</div>
   ${list.map(([day,hrs],idx)=>`<div class="hours-row ${idx===todayIndex?'is-today':''}"><span>${escapeHtml(day)}</span><strong>${escapeHtml(hrs)}</strong></div>`).join('')}
  </div>
 </div>`;
}
function renderPreview(){
 const a=state.appearance; const p=getPromoted();
 const themeClass=state.theme==='dark'?'dark-menu':'';
 const r=state.restaurant;
 return `<div class="public-root ${themeClass} bg-${a.background} template-${a.template} ${knobClasses(a)}" style="${paletteVars(a,state.theme==='dark')}"><div class="public-scroll" id="public-scroll">
  <header class="public-header">
   <div class="public-banner">${r.banner?`<img src="${escapeHtml(r.banner)}" alt="${escapeHtml(r.name)} restaurant">`:`<div class="banner-placeholder">${icon('image',22)}<span>${escapeHtml(t('bannerImage'))}</span></div>`}
    <div class="public-head-actions"><button class="public-head-btn" data-action="language-sheet" aria-label="${escapeHtml(t('language'))}">${icon('globe',17)}</button></div>
   </div>
   <div class="restaurant-line"><div class="public-avatar">${r.avatar?`<img src="${escapeHtml(r.avatar)}" alt="${escapeHtml(r.name)} logo">`:`<span class="avatar-placeholder">${icon('image',20)}</span>`}</div><div class="restaurant-copy"><h1>${escapeHtml(r.name)}</h1><div class="restaurant-meta"><span class="open-chip"><i></i>${escapeHtml(r.status)}</span>${hoursDisclosure()}</div></div></div>
   <label class="public-search">${icon('search',17)}<input id="public-search-input" value="${escapeHtml(ui.menuSearch)}" placeholder="${escapeHtml(t('search'))}" autocomplete="off"></label></header>
   ${p&&p.item.promotion.intensity==='strong'&&!state.preview.strongDismissed?`<button class="strong-promo-card reveal-item" data-action="scroll-item" data-id="${p.item.id}"><img src="${absoluteAsset(p.item.image)}" alt="${escapeHtml(tItem(p.item).name)}"><div><b>${escapeHtml(p.item.promotion.label)}</b><strong>${escapeHtml(tItem(p.item).name)}</strong><span>${escapeHtml(tItem(p.item).ingredients)}</span></div>${icon('chevron',18)}</button>`:''}
   <div class="category-sticky" id="category-sticky"><div class="menu-toolbar"><nav class="category-strip" id="category-strip">${visibleCategories().map((c,idx)=>`<button class="category-chip ${idx===0?'active':''} ${isPromotedCategory(c)?'is-featured':''}" data-action="jump-category" data-id="${c.id}">${escapeHtml(tCategory(c))}</button>`).join('')}</nav><div class="toolbar-actions">${languageToggle()}${currencyToggle()}<button class="filter-btn ${(ui.dietFilter||'all')!=='all'?'active':''}" data-action="filters-sheet" aria-label="${escapeHtml(t('filtersAria'))}">${icon('menu',13)}<span>${escapeHtml(t('filters'))}</span></button></div></div></div>
   <main class="menu-sections">${visibleCategories().length?visibleCategories().map((c,ci)=>renderPublicCategory(c,ci)).join(''):`<div class="card empty" style="margin:16px">${escapeHtml(state.categories.length?t('noMatch'):t('emptyMenu'))}</div>`}</main>
  </div></div>`;
}
function dietMatches(i){
 const f=ui.dietFilter||'all';
 if(f==='all') return true;
 return itemDiets(i).includes(f);
}
function visibleItemsOf(c){ return c.items.filter(i=>i.status!=='hidden'&&(!state.hideSoldOut||i.status!=='soldout')&&dietMatches(i)); }
function visibleCategories(){ return state.categories.filter(c=>visibleItemsOf(c).length); }

/* A promoted category is a different treatment entirely: tinted band, kicker
   label above the heading, coloured heading. */
function renderPublicCategory(c,ci){
 const visible=visibleItemsOf(c);
 const promo=isPromotedCategory(c)?c.promotion:null;
	return `<section class="menu-category ${promo?`is-featured tint-${promo.tint||'brand'}`:''}" id="cat-${c.id}" data-category="${c.id}">${categoryHead(tCategory(c),itemCountLabel(visible.length),promo?(promo.label||'Featured tonight'):'')}<div class="product-list">${visible.map((i,ii)=>renderPublicItem(i,c,ci*4+ii)).join('')}</div></section>`;
}
/* One header shape everywhere: kicker pill, title, count — stacked and centred
   inside a block of fixed rhythm, so no rule ever meets a card border. */
function categoryHead(title,count,kicker){
	return `<div class="menu-category-head"><div class="category-head-inner">${kicker?`<span class="category-kicker">${escapeHtml(kicker)}</span>`:''}<h2>${escapeHtml(title)}</h2><span class="category-count">${escapeHtml(count)}</span></div></div>`;
}
/* One line, never wrapping, never stealing space from the price. The readable
   allergen wording stays; anything that does not fit is reachable through the
   trailing See details chip, which opens the full dish sheet. */
function itemBadges(i,{interactive=true}={}){
 const al=itemAllergens(i), di=itemDiets(i), sp=Number(i.spice)||0;
 if(!al.length&&!di.length&&!sp) return '';
 const pills=[];
 if(di.length) pills.push(`<span class="badge-pill diet">${escapeHtml(dietLabel(di[0]))}</span>`);
 if(sp>0) pills.push(`<span class="badge-pill spice">${escapeHtml(spiceLabel(sp))}</span>`);
 if(al.length) pills.push(`<span class="badge-pill allergen">${escapeHtml(t('contains'))} ${escapeHtml(allergenLabel(al[0]).toLowerCase())}${al.length>1?` +${al.length-1}`:''}</span>`);
 /* Inside a style preview the row must stay inert: a nested <button> would be
    hoisted out by the HTML parser and wreck the surrounding card. */
 if(!interactive) return `<span class="badge-row">${pills.join('')}<span class="badge-pill more">${escapeHtml(t('seeDetails'))}</span></span>`;
 return `<button class="badge-row" data-action="item-details" data-id="${i.id}" aria-label="${escapeHtml(t('detailsAria'))} ${escapeHtml(tItem(i).name)}">${pills.join('')}<span class="badge-pill more">${escapeHtml(t('seeDetails'))}</span></button>`;
}

/* Approximate second price (Euro) shown beside the menu price. */
function approxPrice(base){
 const cur=currencyOf();
 if(displayCurrencyCode()!==cur.primary) return '';
 const list=conversionsFor(base);
 return list.length?`${t('approx')} ${formatCurrency(list[0].value,list[0].code)}`:'';
}
/* Guest-selected display currency (falls back to the restaurant's primary). */
function displayCurrencyCode(){
 const cur=currencyOf();
 const code=ui.displayCurrency;
 if(!code||code===cur.primary) return cur.primary;
 return guestRates().some(r=>r.code===code)?code:cur.primary;
}
function menuPrice(base){
 const cur=currencyOf(); const code=displayCurrencyCode();
 if(code===cur.primary) return money(base);
 const rate=(guestRates().find(r=>r.code===code)||{}).rate;
 const v=convertFromPrimary(base,rate,code);
 return v===null?money(base):`${t('approx')} ${formatCurrency(v,code)}`;
}
function currencyToggle(){
 const cur=currencyOf(); const rates=guestRates();
 if(!rates.length) return '';
 return `<button class="fx-chip" data-action="display-currency" aria-label="${escapeHtml(t('changeCurrency'))}">${escapeHtml(displayCurrencyCode())}${icon('down',10)}</button>`;
}
/* The price column owns its own vertical space: primary price first, the
   approximate second currency beneath it. It never sits inline with badges. */
function priceColumn(i,{showWas=true}={}){
 const p=i.promotion||{};
 const base=itemPrice(i);
 const was=showWas&&isPromoLive(p)&&p.wasPrice?`<span class="product-price-was">${money(Number(p.wasPrice))}</span>`:'';
 const approx=approxPrice(base);
 const from=itemVariants(i).length>1?`<span class="product-price-from">${t('from')}</span>`:'';
 return `<div class="product-price">${was}${from}<span class="product-price-main">${menuPrice(base)}</span>${approx?`<span class="product-price-approx">${approx}</span>`:''}</div>`;
}
function renderPublicItem(i,c,idx,opts){
 const p=i.promotion||{}; const promoted=isPromoLive(p); const tr=tItem(i); const ing=tr.ingredients;
 const style=promoted?(PROMO_STYLES.some(s=>s[0]===p.style)?p.style:(state.appearance.promotionStyle||'framed')):'';
 const label=escapeHtml(p.label||t('recommended'));
 const chrome=!promoted?'':
  style==='ribbon'?`<span class="promo-ribbon"><span>${label}</span></span>`:
  style==='filled'?`<span class="promo-inline-label">${label}</span>`:
  style==='editorial'?`<span class="promo-kicker-line">${label}</span>`:
  style==='offer'?`<span class="promo-strip-label">${label}</span>`:
  `<span class="promo-notch">${label}</span>`;
 /* The offer style prints the price inside its own strip, so the card must not
    also render the price column — one price per card, never two. */
 const isOffer=promoted&&style==='offer';
 const footer=isOffer
  ? `<div class="promo-offer-strip"><span class="offer-terms">${p.terms?`${escapeHtml(t('offerIncludes'))} · ${escapeHtml(p.terms)}`:escapeHtml(t('offerNow'))}</span><span class="offer-price">${p.wasPrice?`<s>${money(Number(p.wasPrice))}</s>`:''}<strong>${menuPrice(itemPrice(i))}</strong>${itemVariants(i).length>1?`<em class="offer-from">${escapeHtml(t('from'))}</em>`:''}</span></div>`
  : '';
 return `<article class="menu-product reveal-item ${promoted?`is-promoted promo-${p.intensity||'subtle'} promo-style-${style}`:''} ${i.status==='hidden'?'hidden-item':''}" data-item-id="${i.id}" data-search="${escapeHtml((tr.name+' '+ing+' '+tCategory(c)).toLowerCase())}" style="transition-delay:${Math.min(idx%5*35,140)}ms">${chrome}<img class="product-img" src="${absoluteAsset(i.image)}" alt="${escapeHtml(tr.name)}" loading="lazy"><div class="product-copy"><h3>${escapeHtml(tr.name)}</h3>${ing?`<p>${escapeHtml(ing)}</p>`:''}${itemBadges(i,{interactive:!opts||!opts.static})}</div>${isOffer?'':priceColumn(i)}${footer}${i.status==='soldout'?`<div class="product-status">${escapeHtml(t('soldOut'))}</div>`:''}</article>`;
}


function renderSuperadmin(){
 const ctx = opsCtx();
 const page = state.adminSubpage ? (HapOps.superSubpages[state.adminSubpage]||HapOps.superPages.overview)(ctx) : (HapOps.superPages[state.adminTab]||HapOps.superPages.overview)(ctx);
 return `<div class="super-shell"><div class="content-scroll"><main class="admin-main">${page}</main></div>${superNav()}</div>`;
}
function superNav(){
 const tabs=[['overview','home','Overview'],['restaurants','building','Restaurants'],['users','users','Users'],['plans','chart','Plans'],['settings','settings','Settings']];
 return `<nav class="admin-bottom-nav" aria-label="Hap Control">${tabs.map(([id,ic,label])=>{const active=state.adminTab===id&&!state.adminSubpage;return `<button class="admin-nav-btn ${active?'active':''}" data-action="super-tab" data-tab="${id}" data-tour="nav-${id}"${active?' aria-current="page"':''}>${icon(ic,21)}<span>${label}</span></button>`;}).join('')}</nav>`;
}

function renderOverlays(){
 let out='';
 if(ui.sheet) out+=`<div class="overlay" data-action="close-sheet"></div>${renderSheet()}`;
 if(ui.modal==='special') out+=renderSpecialModal();
 if(ui.confirm) out+=renderConfirmModal();
 return out;
}
function renderSheet(){
 if(ui.sheet==='currency') return currencySheet();
 if(ui.sheet==='allergens') return allergenSheet();
 if(ui.sheet==='filters') return filtersSheet();
 if(ui.sheet==='itemDetails') return itemDetailsSheet();
 if(ui.sheet==='displayCurrency') return displayCurrencySheet();
 if(ui.sheet==='language') return languageSheet();
 if(ui.sheet==='info') return infoSheet();
 
 if(ui.sheet==='editItem') return editItemSheet();
 if(ui.sheet==='addItem') return addItemSheet();
 if(ui.sheet==='addCategory') return addCategorySheet();
 if(ui.sheet==='addChooser') return addChooserSheet();
 if(ui.sheet==='renameCategory') return renameCategorySheet();

 if(ui.sheet==='auth') return authSheet();
 if(ui.sheet==='promote') return promoteSheet();
 if(ui.sheet==='promoteCategory') return promoteCategorySheet();
 if(ui.sheet==='promoChooser') return promoChooserSheet();
 if(ui.sheet==='bulkAvailability') return bulkAvailabilitySheet();
 if(ui.sheet==='bulkPrice') return bulkPriceSheet();
 if(ui.sheet==='itemActions') return itemActionsSheet();
 if(ui.sheet==='restaurantDetail') return restaurantDetailSheet();
 if(window.HapOps && HapOps.sheet) return HapOps.sheet(ui.sheet, opsCtx(), sheetShell);
 return '';
}
function currencySheet(){
 const f=getItem((ui.sheetData||{}).id);
 if(!f) return '';
 const list=conversionsFor(f.item.price);
 return sheetShell('Approximate price',`${escapeHtml(f.item.name)} · ${money(f.item.price)}`,
  `<div class="fx-list">${list.map(x=>`<div class="fx-row"><div class="fx-row-copy"><strong>${x.code}</strong><span>${escapeHtml(CURRENCIES[x.code].name)}</span></div><div class="fx-row-value">${formatCurrency(x.value,x.code)}</div></div>`).join('')||`<div class="empty-inline">No conversions configured.</div>`}</div>
  <p class="fx-note">Reference conversions set by the restaurant. The price you pay is ${money(f.item.price)}.</p>`);
}
function sheetShell(title,sub,body){ return `<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"${sub?' aria-describedby="sheet-description"':''}><div class="sheet-handle"></div><div class="sheet-head"><div><h2 id="sheet-title">${title}</h2>${sub?`<p id="sheet-description">${sub}</p>`:''}</div><button class="close-btn" data-action="close-sheet" aria-label="Close dialog">${icon('close',18)}</button></div>${body}</section>`; }
/* Persistent language affordance in the sticky toolbar: the guest can see
   which language they are reading and change it without scrolling back to
   the banner. Hidden when the menu is published in one language only. */
function languageToggle(){
 if(menuLanguages().length<2) return '';
 return `<button class="fx-chip lang-chip" data-action="language-sheet" aria-label="${escapeHtml(t('currentLanguage'))}: ${escapeHtml(state.preview.language)}">${escapeHtml(guestLangCode())}${icon('down',10)}</button>`;
}
/* Guests choose between the languages this menu is actually published in.
   The full catalog belongs to the admin translation screen, not here. */
function languageSheet(){
 const published=menuLanguages();
 const rows=published.map(name=>languages.find(l=>l[1]===name)||[langCodeFor(name),name,name]);
 return sheetShell(escapeHtml(t('chooseLanguage')),escapeHtml(t('languageSub')),
  `<div class="language-list">${rows.map(l=>`<button class="language-item ${state.preview.language===l[1]?'active':''}" data-action="select-language" data-lang="${escapeHtml(l[1])}"><span class="lang-code">${escapeHtml(l[0])}</span><strong>${escapeHtml(l[1])}</strong><small>${escapeHtml(l[2])}</small>${state.preview.language===l[1]?icon('check',15):''}</button>`).join('')}</div>`);
}
function infoSheet(){ const r=state.restaurant; const {list,todayIndex}=weekHours(); return sheetShell(r.name,r.city,`<div class="settings-list"><div class="card"><div class="hours-panel-head" style="padding:12px 14px 4px">${icon('calendar',14)} Opening hours</div><div style="padding:0 14px 12px">${list.map(([day,hrs],idx)=>`<div class="hours-row ${idx===todayIndex?'is-today':''}"><span>${escapeHtml(day)}</span><strong>${escapeHtml(hrs)}</strong></div>`).join('')}</div></div><div class="card settings-row"><div class="settings-icon">${icon('location',18)}</div><div class="settings-copy"><strong>${escapeHtml(r.address)}</strong><span>Tap directions on your live menu</span></div></div><div class="card settings-row"><div class="settings-icon">${icon('phone',18)}</div><div class="settings-copy"><strong>${escapeHtml(r.phone)}</strong><span>Call the restaurant</span></div></div></div>`); }

function dietaryFields(item){
 const al=itemAllergens(item), di=itemDiets(item), sp=Number(item&&item.spice)||0;
 return `<div class="field"><label>Allergens</label><div class="chip-check">${ALLERGENS.map(([code,name])=>`<label class="check-chip"><input type="checkbox" name="allergens" value="${code}" ${al.includes(code)?'checked':''}><span>${ALLERGENS.find(x=>x[0]===code)[2]}</span></label>`).join('')}</div><small class="field-hint">Shown as bubbles on the public menu — EU guests expect this.</small></div>
 <div class="field"><label>Dietary</label><div class="chip-check">${DIETS.map(([id,name])=>`<label class="check-chip"><input type="checkbox" name="dietary" value="${id}" ${di.includes(id)?'checked':''}><span>${name}</span></label>`).join('')}</div></div>
 <div class="field"><label>Spice level</label><select name="spice">${[[0,'Not spicy'],[1,'Mild'],[2,'Spicy'],[3,'Very spicy']].map(([v,n])=>`<option value="${v}" ${sp===v?'selected':''}>${n}</option>`).join('')}</select></div>`;
}
function allergenSheet(){
 return sheetShell(escapeHtml(t('allergenGuide')),escapeHtml(t('allergenGuideSub')),
  `<div class="allergen-grid">${ALLERGENS.map(([code,full,short])=>`<div class="allergen-cell"><strong>${escapeHtml(short)}</strong>${full.toLowerCase().startsWith(short.toLowerCase())?'':`<span>${escapeHtml(full)}</span>`}</div>`).join('')}</div>
  <p class="fx-note">${escapeHtml(t('allergyNote'))}</p>`);
}
const SPICE_LABELS=['Not spicy','Mild','Spicy','Very spicy'];
function filtersSheet(){
 const active=ui.dietFilter||'all';
 return sheetShell(escapeHtml(t('filters')),escapeHtml(t('filtersSub')),
  `<div class="sheet-label">${escapeHtml(t('dietary'))}</div>
  <div class="diet-row sheet-diets">${DIET_FILTERS.map(([id,name])=>`<button class="filter-chip ${active===id?'active':''}" data-action="diet-filter" data-diet="${id}">${escapeHtml(id==='all'?t('all'):dietLabel(id))}</button>`).join('')}</div>
  <div class="sheet-label" style="margin-top:16px">${escapeHtml(t('allergenGuide'))}</div>
  <div class="allergen-grid">${ALLERGENS.map(([code,full,short])=>`<div class="allergen-cell"><strong>${escapeHtml(short)}</strong>${full.toLowerCase().startsWith(short.toLowerCase())?'':`<span>${escapeHtml(full)}</span>`}</div>`).join('')}</div>
  <p class="fx-note">${escapeHtml(t('allergyNote'))}</p>`);
}
function itemDetailsSheet(){
 const f=getItem((ui.sheetData||{}).id);
 if(!f) return '';
 const i=f.item, tr=tItem(i);
 const al=itemAllergens(i), di=itemDiets(i), sp=Number(i.spice)||0;
 const price=itemPrice(i);
 const approx=approxPrice(price);
 const vs=itemVariants(i);
 return sheetShell(escapeHtml(tr.name),escapeHtml(tCategory(f.category)),
  `<div class="detail-sheet">
   ${i.image?`<img class="detail-hero" src="${escapeHtml(absoluteAsset(i.image))}" alt="${escapeHtml(tr.name)}" loading="lazy">`:`<div class="detail-hero detail-hero-empty" aria-hidden="true">${icon('menu',22)}</div>`}
   ${vs.length>1
    ? `<div class="detail-variants">${vs.map(v=>{const ap=approxPrice(v.price); return `<div class="detail-variant"><span>${escapeHtml(v.name)}</span><b>${menuPrice(v.price)}${ap?`<small>${ap}</small>`:''}</b></div>`;}).join('')}</div>`
    : `<div class="detail-price-block"><b class="detail-price-main">${menuPrice(price)}</b>${approx?`<span class="detail-price-approx">${approx}</span>`:''}</div>`}
   ${tr.ingredients?`<p class="detail-ingredients">${escapeHtml(tr.ingredients)}</p>`:''}
   ${di.length||sp>0?`<div class="detail-tags">${di.map(d=>`<span class="detail-tag">${escapeHtml(dietLabel(d))}</span>`).join('')}${sp>0?`<span class="detail-tag hot">${escapeHtml(spiceLabel(sp))}</span>`:''}</div>`:''}
   <div class="detail-block">
    <span class="detail-block-label">${escapeHtml(t('contains'))}</span>
    ${al.length?`<ul class="allergen-plain">${al.map(code=>`<li>${escapeHtml(allergenLabel(code))}${allergenHint(code)?`<small>${escapeHtml(allergenHint(code))}</small>`:''}</li>`).join('')}</ul>`:`<p class="detail-block-empty">${escapeHtml(t('noAllergens'))}</p>`}
   </div>
  </div>
  <p class="fx-note">${escapeHtml(t('allergyNote'))}</p>`);
}

function displayCurrencySheet(){
 const cur=currencyOf(); const code=displayCurrencyCode();
 const options=[cur.primary,...guestRates().map(r=>r.code)];
 return sheetShell(escapeHtml(t('displayCurrency')),escapeHtml(t('displayCurrencySub')),
  `<div class="fx-list">${options.map(c=>`<button class="fx-row fx-row-btn ${c===code?'active':''}" data-action="set-display-currency" data-code="${c}"><div class="fx-row-copy"><strong>${c}</strong><span>${escapeHtml((CURRENCIES[c]||{}).name||c)}</span></div><div class="fx-row-value">${escapeHtml(c===cur.primary?t('menuPrice'):t('approximate'))}${c===code?icon('check',15):''}</div></button>`).join('')}</div>
  <p class="fx-note">${escapeHtml(t('youPayIn'))} ${escapeHtml(cur.primary)}.</p>`);
}
/* Price block for the item editor: one price, or an ordered variant list.
   The mode follows the data, so an item seeded with variants opens on the
   variant editor instead of a single field that would wipe them. */
function priceModeField(item){
 const cur=currencyOf().primary;
 const rows=draftVariants(item);
 const variantMode=rows.length>0;
 const toggle=`<div class="field"><label>Pricing</label><div class="segment-control" role="group" aria-label="Pricing mode">
  <button type="button" class="${variantMode?'':'active'}" aria-pressed="${!variantMode}" data-action="item-price-mode" data-mode="single" data-id="${item.id}">Single price</button>
  <button type="button" class="${variantMode?'active':''}" aria-pressed="${variantMode}" data-action="item-price-mode" data-mode="variants" data-id="${item.id}">Variants</button>
 </div></div>`;
 if(!variantMode){
  return `${toggle}<div class="field"><label>Price (${cur})</label><input name="price" type="number" min="0" step="0.1" value="${item.price}"></div>`;
 }
 return `${toggle}<div class="field"><label>Variants (${cur})</label><div class="variant-list">${rows.map((v,idx)=>`<div class="variant-row">
   <input name="variantName" value="${escapeHtml(v.name||'')}" placeholder="e.g. Small" aria-label="Variant ${idx+1} name">
   <input name="variantPrice" type="number" min="0" step="0.1" value="${Number(v.price)||0}" aria-label="Variant ${idx+1} price">
   <button type="button" class="icon-btn variant-del" data-action="variant-remove" data-idx="${idx}" data-id="${item.id}" aria-label="Remove variant ${idx+1}">${icon('trash',15)}</button>
  </div>`).join('')}</div>
  <button type="button" class="btn full" data-action="variant-add" data-id="${item.id}">${icon('plus',15)} Add variant</button>
  <small class="field-hint">Guests see the cheapest variant as “from”, and the full list when they open the dish.</small></div>`;
}
function editItemSheet(){
 const found=getItem(ui.sheetData?.id); if(!found) return ''; const {item,category}=found;
 return sheetShell('Edit item',category.name,`<form id="edit-item-form" class="form-grid"><input type="hidden" name="id" value="${item.id}"><div class="field"><label>Name</label><input name="name" value="${escapeHtml(item.name)}" required></div><div class="field"><label>Ingredients</label><input name="ingredients" value="${escapeHtml(itemIngredients(item))}" maxlength="90" placeholder="Tomato, mozzarella, basil"><small class="field-hint">Short list shown under the name on the public menu.</small></div>${priceModeField(item)}<div class="field"><label>Category</label><select name="category">${state.categories.map(c=>`<option value="${c.id}" ${c.id===category.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>${photoPresetField(item.image)}${statusField(item.status)}${dietaryFields(item)}<button class="btn primary full" type="button" data-action="save-item-form">Save changes</button><div class="form-row" style="margin-top:8px"><button class="btn full" type="button" data-action="duplicate-item" data-id="${item.id}">${icon('copy',15)} Duplicate</button><button class="btn danger full" type="button" data-action="delete-item" data-id="${item.id}">${icon('trash',15)} Delete</button></div></form>`);
}
function addItemSheet(){ if(!state.categories.length) return sheetShell('Add menu item','A dish needs a category.','<div class="card empty">Create a category first, then add dishes to it.</div>');
 const cat=ui.sheetData?.category||state.categories[0].id; return sheetShell('Add menu item','Photo, name, ingredients, price.',`<form id="add-item-form" class="form-grid"><div class="field"><label>Name</label><input name="name" required placeholder="e.g. Wild Mushroom Risotto"></div><div class="field"><label>Ingredients</label><input name="ingredients" maxlength="90" placeholder="Arborio rice, mushrooms, parmesan"><small class="field-hint">Short list shown under the name on the public menu.</small></div><div class="form-row"><div class="field"><label>Price (${currencyOf().primary})</label><input name="price" type="number" step="0.1" value="950"></div><div class="field"><label>Category</label><select name="category">${state.categories.map(c=>`<option value="${c.id}" ${c.id===cat?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div></div>${photoPresetField(null)}${statusField('available')}${dietaryFields(null)}<button class="btn primary full" type="button" data-tour="sheet-primary" data-action="save-add-item">Add item</button></form>`); }
function addCategorySheet(){ return sheetShell('Add category','Keep category names short and scannable.',`<form id="add-category-form" class="form-grid"><div class="field"><label>Category name</label><input name="name" required placeholder="e.g. Breakfast"></div><button class="btn primary full" type="button" data-action="save-add-category">Add category</button></form>`); }
function addChooserSheet(){
 return sheetShell('Add to your menu','What would you like to add?',`<div class="choice-grid"><button class="choice" data-action="open-add-item"><strong>${icon('plus',15)} Add item</strong><span>A dish with photo, price, allergens</span></button><button class="choice" data-action="open-add-category"><strong>${icon('menu',15)} Add category</strong><span>A new section, like Breakfast</span></button></div>`);
}
function renameCategorySheet(){
 const c=state.categories.find(x=>x.id===ui.sheetData?.id); if(!c) return '';
 return sheetShell('Rename category','Guests see this name on the public menu.',`<form id="rename-category-form" class="form-grid"><input type="hidden" name="id" value="${c.id}"><div class="field"><label>Category name</label><input name="name" value="${escapeHtml(c.name)}" required></div><button class="btn primary full" type="button" data-action="save-rename-category">Save name</button></form>`);
}

/* The style gallery renders the real guest card for this dish, so the owner can
   predict the result instead of decoding an abstract swatch. */
function promoPreview(item,category,temp,style){
 const clone={...item,promotion:{intensity:temp.intensity||'normal',label:temp.label||"Tonight's Pick",style,wasPrice:temp.wasPrice?Number(temp.wasPrice):null,terms:temp.terms||'',mode:'now',active:true,startAt:Date.now(),endAt:null}};
 const a=state.appearance;
 return `<div class="promo-preview public-root ${state.theme==='dark'?'dark-menu':''} template-${a.template}" style="${paletteVars(a,state.theme==='dark')}"><div class="product-list">${renderPublicItem(clone,category,0,{static:true})}</div></div>`;
}
/* Schedule editing is one shared control, so a dish promotion and a category
   takeover cannot drift apart in behaviour. */
function scheduleTempFrom(p){
 let mode=p.mode;
 if(!mode){
  const until=p.until||'none';
  mode = until==='none' ? 'now' : until==='tonight' ? 'closing' : 'schedule';
 }
 const w=promoWindow(p);
 return {
  mode,
  startAt: w.start||Date.now(),
  endAt: w.end,
  days: promoDays(p),
  from: p.from||'17:00',
  to: p.to||'23:00'
 };
}
function scheduleFields(temp){
 const start=Number(temp.startAt)||Date.now();
 const end=temp.endAt?Number(temp.endAt):Date.now()+6048e5;
 const days=Array.isArray(temp.days)?temp.days.map(Number):[0,1,2,3,4,5,6];
 let detail='';
 if(temp.mode==='schedule'){
  detail=`<div class="form-grid" style="margin-top:9px">
   <div class="field"><label>Starts</label><input type="datetime-local" value="${toLocalInput(start)}" data-action="promo-temp-input" data-key="startAt"></div>
   <div class="field"><label>Ends</label><input type="datetime-local" value="${toLocalInput(end)}" data-action="promo-temp-input" data-key="endAt"></div>
  </div>`;
 } else if(temp.mode==='custom'){
  detail=`<div class="diet-row" style="margin-top:9px">${DAY_SHORT.map((d,i)=>`<button class="filter-chip ${days.includes(i)?'active':''}" data-action="promo-day" data-day="${i}" aria-pressed="${days.includes(i)}">${d}</button>`).join('')}</div>
  <div class="form-grid" style="margin-top:9px">
   <div class="field"><label>From</label><input type="time" value="${escapeHtml(temp.from||'17:00')}" data-action="promo-temp-input" data-key="from"></div>
   <div class="field"><label>To</label><input type="time" value="${escapeHtml(temp.to||'23:00')}" data-action="promo-temp-input" data-key="to"></div>
  </div>`;
 }
 const preview=promoEndsLabel(draftPromotion(temp));
 return `<div class="sheet-section"><div class="sheet-label">When does it run?</div>
 <div class="segment-control">${PROMO_MODES.map(([id,n])=>`<button class="${temp.mode===id?'active':''}" data-action="promo-temp" data-key="mode" data-value="${id}">${n}</button>`).join('')}</div>
 ${detail}
 <p class="fx-note">${escapeHtml(preview)} · expired promotions come off the menu automatically.</p></div>`;
}
/* The schedule half of a promotion, resolved from the draft in the sheet. */
function draftPromotion(temp){
 const mode=PROMO_MODES.some(m=>m[0]===temp.mode)?temp.mode:'now';
 const now=Date.now();
 const base={mode,active:true,days:Array.isArray(temp.days)?temp.days.map(Number):[0,1,2,3,4,5,6],from:temp.from||'17:00',to:temp.to||'23:00'};
 if(mode==='now') return {...base,startAt:now,endAt:null};
 if(mode==='closing') return {...base,startAt:now,endAt:endOfDay(now)};
 if(mode==='custom') return {...base,startAt:Number(temp.startAt)||now,endAt:temp.endAt?Number(temp.endAt):null};
 return {...base,startAt:Number(temp.startAt)||now,endAt:temp.endAt?Number(temp.endAt):endOfDay(now+6048e5)};
}
function promoteSheet(){
 const found=getItem(ui.sheetData?.id); if(!found) return ''; const item=found.item, category=found.category; const p=item.promotion||{};
 const temp=ui.sheetData.temp||{intensity:p.intensity||'normal',label:p.label||"Tonight's Pick",style:PROMO_STYLES.some(s=>s[0]===p.style)?p.style:'framed',wasPrice:p.wasPrice??'',terms:p.terms||'',...scheduleTempFrom(p)}; ui.sheetData.temp=temp;
 const active=itemPromotions().filter(x=>x.item.id!==item.id).length;
 const conflict=promoConflict('item',item.id,{intensity:temp.intensity});
 return sheetShell(`Promote ${escapeHtml(item.name)}`,'Make it noticeable, not annoying.',`
 ${ui.sheetData.error?`<div class="promo-warn" role="alert">${escapeHtml(ui.sheetData.error)}</div>`:''}
 ${conflict?`<div class="promo-warn" role="alert">${escapeHtml(conflict)} is already running as a strong promotion. End or soften it first, or choose Subtle or Normal here.</div>`:''}
 ${active>=3?`<div class="promo-warn">${active+1} promotions active — the menu stops feeling special.</div>`:''}
 <div class="sheet-section"><div class="sheet-label">Label</div><div class="preset-scroll">${PROMO_LABELS.map(l=>`<button class="preset ${temp.label===l?'selected':''}" data-action="promo-temp" data-key="label" data-value="${escapeHtml(l)}"><strong>${escapeHtml(l)}</strong></button>`).join('')}</div></div>
 <div class="sheet-section"><div class="sheet-label">Card design</div><div class="promo-gallery">${PROMO_STYLES.map(([id,n,desc])=>`<div class="promo-style-card ${temp.style===id?'selected':''}" role="button" tabindex="0" aria-pressed="${temp.style===id}" data-action="promo-temp" data-key="style" data-value="${id}"><div class="promo-style-head"><strong>${escapeHtml(n)}</strong><span>${escapeHtml(desc)}</span></div>${promoPreview(item,category,temp,id)}<div class="promo-style-foot"><span class="promo-style-mark">${icon('check',13)}</span>${temp.style===id?'Keeping this style':'Keep this style'}</div></div>`).join('')}</div></div>
 <div class="sheet-section"><div class="sheet-label">Offer detail <small>optional</small></div><div class="form-grid">
  <div class="field"><label>Was price (${escapeHtml(currencyOf().primary)})</label><input type="number" step="0.01" min="0" value="${escapeHtml(String(temp.wasPrice??''))}" data-action="promo-temp-input" data-key="wasPrice" placeholder="Higher than ${escapeHtml(String(item.price))}"></div>
  <div class="field"><label>Terms</label><input value="${escapeHtml(temp.terms||'')}" data-action="promo-temp-input" data-key="terms" placeholder="Today only · 2 plates minimum"></div>
 </div></div>
 ${scheduleFields(temp)}
 <div class="sheet-section"><div class="sheet-label">How noticeable?</div><div class="segment-control">${['subtle','normal','strong'].map(id=>`<button class="${temp.intensity===id?'active':''}" data-action="promo-temp" data-key="intensity" data-value="${id}">${id[0].toUpperCase()+id.slice(1)}</button>`).join('')}</div></div>
 <button class="btn primary full" data-tour="sheet-primary" data-action="save-promotion" data-id="${item.id}">Save promotion</button>${p.active?`<button class="btn full" style="margin-top:8px" data-action="end-promotion" data-kind="item" data-id="${item.id}">End promotion</button>`:''}`);
}
function promoteCategorySheet(){
 const c=state.categories.find(x=>x.id===ui.sheetData?.id); if(!c) return '';
 const p=c.promotion||{};
 const temp=ui.sheetData.temp||{label:p.label||'Featured tonight',tint:p.tint||'brand',...scheduleTempFrom(p)}; ui.sheetData.temp=temp;
 const conflict=promoConflict('category',c.id,{});
 return sheetShell(`Promote ${escapeHtml(c.name)}`,'The whole section gets a tinted band and a kicker label.',`
 ${ui.sheetData.error?`<div class="promo-warn" role="alert">${escapeHtml(ui.sheetData.error)}</div>`:''}
 ${conflict?`<div class="promo-warn" role="alert">${escapeHtml(conflict)} is already featured. Only one section can take over the menu at a time.</div>`:''}
 <div class="sheet-section"><div class="sheet-label">Kicker label</div><div class="preset-scroll">${['Featured tonight','Chef recommends','Seasonal menu','Happy hour','Sweet finish'].map(l=>`<button class="preset ${temp.label===l?'selected':''}" data-action="promo-temp" data-key="label" data-value="${escapeHtml(l)}"><strong>${escapeHtml(l)}</strong></button>`).join('')}</div></div>
 <div class="sheet-section"><div class="sheet-label">Tint</div><div class="segment-control">${CATEGORY_TINTS.map(([id,n])=>`<button class="${temp.tint===id?'active':''}" data-action="promo-temp" data-key="tint" data-value="${id}">${n}</button>`).join('')}</div></div>
 <div class="sheet-section"><div class="sheet-label">Preview</div><div class="promo-preview public-root ${state.theme==='dark'?'dark-menu':''} template-${state.appearance.template}" style="${paletteVars(state.appearance,state.theme==='dark')}"><section class="menu-category is-featured tint-${temp.tint||'brand'}">${categoryHead(c.name,`${c.items.length} items`,temp.label||'Featured tonight')}</section></div></div>
 ${scheduleFields(temp)}
 <button class="btn primary full" data-action="save-category-promotion" data-id="${c.id}">Save promotion</button>${p.active?`<button class="btn full" style="margin-top:8px" data-action="end-promotion" data-kind="category" data-id="${c.id}">End promotion</button>`:''}`);
}

function promoChooserSheet(){
 if(!state.categories.length) return sheetShell('New promotion','Nothing to promote yet.','<div class="card empty">Add a category and a dish first, then come back to feature it.</div>');
 return sheetShell('New promotion','Feature one dish, or a whole section.',`
 <div class="sheet-section"><div class="sheet-label">Promote a dish</div><div class="settings-list">${!allItems().length?'<div class="card empty">No dishes yet.</div>':allItems().map(i=>`<button class="card settings-row" data-action="promote-item" data-id="${i.id}"><div class="settings-icon">${icon('spark',17)}</div><div class="settings-copy"><strong>${escapeHtml(i.name)}</strong><span>${itemPriceLabel(i)}${isPromoLive(i.promotion)?' · already promoted':''}</span></div>${icon('chevron',15)}</button>`).join('')}</div></div>
 <div class="sheet-section"><div class="sheet-label">Promote a category</div><div class="settings-list">${state.categories.map(c=>`<button class="card settings-row" data-action="promote-category" data-id="${c.id}"><div class="settings-icon">${icon('menu',17)}</div><div class="settings-copy"><strong>${escapeHtml(c.name)}</strong><span>${c.items.length} items${isPromotedCategory(c)?' · already featured':''}</span></div>${icon('chevron',15)}</button>`).join('')}</div></div>`);
}
function bulkAvailabilitySheet(){
 const items=allItems();
 return sheetShell('Mark sold out','Tap the dishes that ran out, then save once.',`
 <div class="bulk-list">${items.map(i=>{const st=(ui.sheetData.temp||{})[i.id]??i.status;return `<button class="bulk-row ${st==='soldout'?'is-soldout':''}" data-action="bulk-toggle" data-id="${i.id}"><img src="${absoluteAsset(i.image)}" alt="${escapeHtml(i.name)}"><div class="bulk-copy"><strong>${escapeHtml(i.name)}</strong><span>${st==='soldout'?'Sold out':st==='hidden'?'Hidden':'Available'}</span></div><i class="bulk-box">${st==='soldout'?icon('check',13):''}</i></button>`;}).join('')}</div>
 <button class="btn primary full" style="margin-top:12px" data-action="save-bulk-availability">Save availability</button>`);
}
function bulkPriceSheet(){
 const cur=currencyOf().primary;
 return sheetShell('Update prices',`Every dish in ${escapeHtml(cur)}. Changes save as you go.`,`
 <div class="bulk-list">${allItems().map(i=>`<div class="bulk-row static"><img src="${absoluteAsset(i.image)}" alt="${escapeHtml(i.name)}"><div class="bulk-copy"><strong>${escapeHtml(i.name)}</strong><span>${hasVariants(i)?`${itemVariants(i).length} variants`:escapeHtml(cur)}</span></div>${hasVariants(i)
  ? `<span class="bulk-variant-note">${itemPriceLabel(i)}</span>`
  : `<input class="bulk-price" type="number" step="0.01" min="0" value="${escapeHtml(String(i.price))}" data-action="bulk-price-input" data-id="${i.id}" aria-label="Price for ${escapeHtml(i.name)}">`}</div>`).join('')}</div>
 <button class="btn primary full" style="margin-top:12px" data-action="close-sheet">Done</button>`);
}
function itemActionsSheet(){
 const f=getItem(ui.sheetData?.id); if(!f) return '';
 const i=f.item;
 const rows=[['edit-item','Edit',icon('edit',17)],['cycle-status','Availability',icon('eyeOff',17)],['promote-item','Promote',icon('spark',17)],['move-item-up','Move up',icon('up',17)],['move-item-down','Move down',icon('down',17)]];
 return sheetShell(escapeHtml(i.name),`${escapeHtml(f.category.name)} · ${itemPriceLabel(i)}`,`
 <div class="settings-list">${rows.map(([a,n,ic])=>`<button class="card settings-row" data-action="${a}" data-id="${i.id}" data-dir="${a==='move-item-up'?'up':'down'}"><div class="settings-icon">${ic}</div><div class="settings-copy"><strong>${n}</strong></div>${icon('chevron',15)}</button>`).join('')}
 <button class="card settings-row" data-action="delete-item" data-id="${i.id}"><div class="settings-icon">${icon('trash',17)}</div><div class="settings-copy"><strong style="color:var(--danger)">Delete</strong></div></button></div>`);
}
function restaurantDetailSheet(){
 const r=state.superadmin.restaurants.find(x=>x.id===ui.sheetData?.id); if(!r) return '';
 return sheetShell(r.name,'Restaurant detail',`<div class="stat-grid"><div class="card stat"><span>Owner</span><strong style="font-size:14px;margin-top:7px">${escapeHtml(r.owner)}</strong></div><div class="card stat"><span>Status</span><strong style="font-size:14px;margin-top:7px">${escapeHtml(r.status)}</strong></div><div class="card stat"><span>Views</span><strong>${escapeHtml(r.views)}</strong></div><div class="card stat"><span>Languages</span><strong>${r.languages}</strong></div></div><div class="settings-list" style="margin-top:12px"><div class="card settings-row"><div class="settings-icon">${icon('eye',18)}</div><div class="settings-copy"><strong>Public menu</strong><span>Inspect customer-facing menu</span></div></div><div class="card settings-row"><div class="settings-icon">${icon('qr',18)}</div><div class="settings-copy"><strong>QR</strong><span>Latest QR design</span></div></div><div class="card settings-row"><div class="settings-icon">${icon('activity',18)}</div><div class="settings-copy"><strong>Last activity</strong><span>${escapeHtml(r.last)}</span></div></div></div>`);
}
function renderSpecialModal(){
 const p=getPromoted(); if(!p) return '';
 return `<div class="overlay"></div><div class="special-modal" role="dialog" aria-modal="true" aria-labelledby="special-modal-title"><button class="close-btn" style="position:absolute;right:14px;top:14px" data-action="close-modal" aria-label="Close promotion">${icon('close',18)}</button><span class="modal-badge">${icon('spark',13)} ${escapeHtml(p.item.promotion.label)}</span><h2 id="special-modal-title">${escapeHtml(p.item.name)}</h2><p>Something worth noticing — just for tonight.</p><div class="modal-media"><img src="${absoluteAsset(p.item.image)}" alt="${escapeHtml(p.item.name)}" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded')"></div><p>${escapeHtml(itemIngredients(p.item))}</p><div class="price">${itemPriceLabel(p.item)}</div><button class="btn primary full" data-action="view-special" data-id="${p.item.id}">View on menu ${icon('chevron',15)}</button><button class="btn full" style="margin-top:7px" data-action="close-modal">Maybe later</button></div>`;
}
function renderConfirmModal(){
 const c=ui.confirm;
 return `<div class="overlay" data-action="confirm-cancel"></div><div class="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description"><strong id="confirm-title">${escapeHtml(c.title)}</strong><p id="confirm-description">${escapeHtml(c.body)}</p><div class="confirm-actions"><button class="btn" data-action="confirm-cancel">Cancel</button><button class="btn ${c.tone==='danger'?'danger':'primary'} full" data-action="confirm-action">${escapeHtml(c.label)}</button></div></div>`;
}

function postRender(){
 document.documentElement.style.setProperty('--brand',state.appearance.brand);
 restoreScroll();
 if(ui.sheet || ui.modal || ui.confirm){
  const overlay = document.querySelector('.sheet, .special-modal, .confirm-modal');
  if(overlay){
   const first = overlay.querySelector('input, select, textarea, button');
   if(first) setTimeout(()=>first.focus(), 0);
  }
 } else {
  restoreFocus();
 }
 requestAnimationFrame(()=>{
  document.querySelectorAll('.reveal-item').forEach((el,i)=>{ if(!('IntersectionObserver' in window)){el.classList.add('visible');return;} });
  setupReveal(); setupPublicObservers(); renderLiveQr(); mountTour(); scaleTemplatePreviews();
 });
 if(state.mode==='landing') startLandingDemo();
 if(state.mode==='preview'&&!state.preview.languageConfirmed&&!ui.sheet&&!ui.modal){ setTimeout(()=>{ ui.sheet='language'; render(); },80); }
}
function setupReveal(){
 const els=[...document.querySelectorAll('.reveal-item')];
 if(!els.length) return;
 if(!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('visible'));return;}
 const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);}}),{root:document.getElementById('public-scroll'),rootMargin:'0px 0px -8% 0px',threshold:.08});
 els.forEach(e=>obs.observe(e));
}
function setupPublicObservers(){
 if(state.mode!=='preview') return;
 const scroller=document.getElementById('public-scroll'); if(!scroller) return;
 const sticky=document.getElementById('category-sticky');
 const updateActive=()=>{
  const sections=[...document.querySelectorAll('.menu-category')].filter(s=>s.style.display!=='none');
  if(!sections.length) return;
  const scrollerTop=scroller.getBoundingClientRect().top;
  const marker=scrollerTop+Math.min(170,scroller.clientHeight*.28);
  let current=sections[0];
  for(const sec of sections){ if(sec.getBoundingClientRect().top<=marker) current=sec; else break; }
  setActiveCategory(current.dataset.category);
 };
 let ticking=false;
 scroller.addEventListener('scroll',()=>{
  /* The prototype bar only exists in the owner preview; the public menu has
     no chrome above the sticky toolbar. */
  const bar=document.querySelector('.prototype-bar');
  const barBottom=bar?bar.getBoundingClientRect().bottom:scroller.getBoundingClientRect().top;
  if(sticky) sticky.classList.toggle('stuck',sticky.getBoundingClientRect().top<=barBottom+1);
  if(!ticking){ ticking=true; requestAnimationFrame(()=>{updateActive();ticking=false;}); }
 },{passive:true});
 updateActive();
 if('IntersectionObserver' in window){
  const po=new IntersectionObserver(entries=>entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('promo-attention'); po.unobserve(e.target);} }),{root:scroller,rootMargin:'-28% 0px -35% 0px',threshold:.45}); document.querySelectorAll('.menu-product.is-promoted').forEach(p=>po.observe(p));
  const iv=new IntersectionObserver(entries=>entries.forEach(e=>{ if(e.isIntersecting){ const id=e.target.dataset.itemId; iv.unobserve(e.target); if(id&&!seenItems.has(id)){ seenItems.add(id); track('item_view',{id}); } } }),{root:scroller,threshold:.5});
  document.querySelectorAll('.menu-product').forEach(p=>iv.observe(p));
 }
 const search=document.getElementById('public-search-input'); search?.addEventListener('input',e=>{ui.menuSearch=e.target.value;trackSearch(e.target.value);filterPublicItems(e.target.value);updateActive();});
 setupCategoryPagers();
}
/* Kiosk rows scroll two tiles at a time; the dots make that legible. */
function setupCategoryPagers(){
 document.querySelectorAll('.template-grid .product-list').forEach(list=>{
  list.nextElementSibling?.classList.contains('pager-dots')&&list.nextElementSibling.remove();
  const pages=Math.ceil(list.scrollWidth/Math.max(1,list.clientWidth));
  if(list.scrollWidth<=list.clientWidth+2||pages<2) return;
  const dots=document.createElement('div');
  dots.className='pager-dots';
  dots.innerHTML=Array.from({length:pages},(_,i)=>`<i class="${i===0?'on':''}"></i>`).join('');
  list.after(dots);
  let raf=false;
  list.addEventListener('scroll',()=>{
   if(raf) return; raf=true;
   requestAnimationFrame(()=>{
    raf=false;
    const idx=Math.round(list.scrollLeft/Math.max(1,list.clientWidth));
    dots.querySelectorAll('i').forEach((d,i)=>d.classList.toggle('on',i===idx));
   });
  },{passive:true});
 });
}
function setActiveCategory(id){ document.querySelectorAll('.category-chip').forEach(b=>b.classList.toggle('active',b.dataset.id===id)); const active=document.querySelector(`.category-chip[data-id="${CSS.escape(id)}"]`); const strip=document.getElementById('category-strip'); if(active&&strip){ const left=active.offsetLeft-(strip.clientWidth-active.offsetWidth)/2; strip.scrollTo({left:Math.max(0,left),behavior:preferredScrollBehavior()}); } }
function scrollToCategory(id){ const scroller=document.getElementById('public-scroll'); const target=document.getElementById(`cat-${id}`); const sticky=document.getElementById('category-sticky'); if(!scroller||!target)return; const top=target.getBoundingClientRect().top-scroller.getBoundingClientRect().top+scroller.scrollTop-(sticky?.offsetHeight||0)-4; scroller.scrollTo({top:Math.max(0,top),behavior:preferredScrollBehavior()}); }
function filterPublicItems(q){ const t=q.trim().toLowerCase(); document.querySelectorAll('.menu-product').forEach(el=>el.style.display=!t||el.dataset.search.includes(t)?'':'none'); document.querySelectorAll('.menu-category').forEach(sec=>{ const any=[...sec.querySelectorAll('.menu-product')].some(el=>el.style.display!=='none'); sec.style.display=any?'':'none'; }); }
function tourStep(){ return TOUR_STEPS[Math.min(state.tour.step,TOUR_STEPS.length-1)]; }
function applyTourNav(i){
 const nav=TOUR_STEPS[i]&&TOUR_STEPS[i].nav; if(!nav) return;
 if(nav.role) state.role=nav.role;
 if(nav.mode) state.mode=nav.mode;
 if(nav.tab){ state.adminTab=nav.tab; state.adminSubpage=null; }
 if(nav.subpage && ADMIN_SUBPAGES[nav.subpage]){ state.adminSubpage=nav.subpage; state.adminTab=ADMIN_SUBPAGES[nav.subpage].tab; }
 if(nav.menuTab) setMenuTab(nav.menuTab);

 if(nav.expand) ui.expandedCategory=nav.expand;
}
function startTour(){ state.tour={active:true,step:0,done:false}; state.mode='admin'; state.role='restaurant'; state.adminTab='home'; state.adminSubpage=null; ui.sheet=null; ui.modal=null; applyTourNav(0); save(); render(); }
function tourNext(){
 const next=state.tour.step+1;
 if(next>=TOUR_STEPS.length){ endTour(true); return; }
 state.tour.step=next; applyTourNav(next); save(); render();
}
function tourBack(){ if(state.tour.step===0) return; state.tour.step-=1; applyTourNav(state.tour.step); save(); render(); }
function endTour(completed){ state.tour={active:false,step:0,done:true}; save(); toast(completed?'You are all set':'Tour skipped — replay it from More'); render(); }
function mountTour(){
 document.getElementById('tour-layer')?.remove();
 if(!state.tour||!state.tour.active) return;
 const phone=document.querySelector('.phone-app'); if(!phone) return;
 const step=tourStep(); const idx=Math.min(state.tour.step,TOUR_STEPS.length-1);
 let el=step.target?phone.querySelector('[data-tour="'+step.target+'"]'):null;
 if(el){
  const scroller=el.closest('.content-scroll,.public-scroll,.sheet');
  if(scroller){
   const er=el.getBoundingClientRect(), sr=scroller.getBoundingClientRect();
   if(er.top<sr.top+10||er.bottom>sr.bottom-10) scroller.scrollTop+=(er.top-sr.top)-(sr.height/2-er.height/2);
  }
 }
 const pr=phone.getBoundingClientRect();
 const layer=document.createElement('div'); layer.id='tour-layer'; layer.className='tour-layer';
 let html='';
 let below=true, spotBottom=0, spotTop=0;
 if(el){
  const r=el.getBoundingClientRect(); const pad=7;
  const x=Math.max(0,r.left-pr.left-pad), y=Math.max(0,r.top-pr.top-pad);
  const w=Math.min(pr.width-x,r.width+pad*2), h=Math.min(pr.height-y,r.height+pad*2);
  spotTop=y; spotBottom=y+h; below=(y+h)<pr.height*0.52;
  html+=`<div class="tour-dim" style="left:0;top:0;width:100%;height:${y}px"></div>`;
  html+=`<div class="tour-dim" style="left:0;top:${y+h}px;width:100%;bottom:0"></div>`;
  html+=`<div class="tour-dim" style="left:0;top:${y}px;width:${x}px;height:${h}px"></div>`;
  html+=`<div class="tour-dim" style="left:${x+w}px;top:${y}px;right:0;height:${h}px"></div>`;
  html+=`<div class="tour-ring" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>`;
 } else {
  html+=`<div class="tour-dim" style="inset:0"></div>`;
 }
 const dots=TOUR_STEPS.map((_,i)=>`<i class="${i===idx?'on':i<idx?'past':''}"></i>`).join('');
 const cardPos=el?(below?`top:${spotBottom+14}px`:`bottom:${Math.max(12,pr.height-spotTop+14)}px`):'top:50%;transform:translateY(-50%)';
 html+=`<div class="tour-card${el?'':' tour-card-center'}" style="${cardPos}">
  <div class="tour-top"><span class="tour-count">${idx+1} / ${TOUR_STEPS.length}</span><button class="tour-skip" data-action="tour-skip">Skip</button></div>
  <h3>${escapeHtml(step.title)}</h3>
  <p>${escapeHtml(step.body)}</p>
  <div class="tour-dots">${dots}</div>
  <div class="tour-actions">
   ${idx>0?`<button class="tour-ghost" data-action="tour-back">Back</button>`:''}
   ${step.tap?`<span class="tour-tap">${icon('spark',13)} Tap the highlighted control</span>`:`<button class="tour-cta" data-action="tour-next">${escapeHtml(step.cta||'Next')} ${icon('chevron',14)}</button>`}
  </div>
 </div>`;
 layer.innerHTML=html;
 phone.appendChild(layer);
}
let tourTick=false;
window.addEventListener('resize',()=>{ if(state.tour&&state.tour.active) mountTour(); });
document.addEventListener('scroll',()=>{
 if(!state.tour||!state.tour.active||tourTick) return; tourTick=true;
 requestAnimationFrame(()=>{ mountTour(); tourTick=false; });
},true);

app.addEventListener('keydown',e=>{
 if(e.key!=='Enter'&&e.key!==' ') return;
 const el=e.target.closest('[role="button"][data-action]'); if(!el) return;
 e.preventDefault(); el.click();
});
app.addEventListener('click',e=>{
 if(state.tour&&state.tour.active){
  const st=tourStep();
  if(st&&st.tap&&st.target&&e.target.closest('[data-tour="'+st.target+'"]')) setTimeout(()=>{ if(state.tour.active) tourNext(); },0);
 }
 const btn=e.target.closest('[data-action]'); if(!btn) return; const a=btn.dataset.action;
 const opensOverlay = ['open-auth','language-sheet','info-sheet','open-add-item','open-add-category','add-chooser','rename-category','edit-item','promote-item','restaurant-detail','open-sheet'].includes(a);
 if(opensOverlay) rememberFocus(btn);
 if(a==='view-menu'){ openPublicMenu(); return; }
 if(a==='theme-toggle'){ state.theme=state.theme==='dark'?'light':'dark'; state.appearance.mode=state.theme; save(); render(); return; }
 if(a==='set-theme'){ state.theme=btn.dataset.theme; state.appearance.mode=state.theme; save(); render(); return; }
 /* Tab switches render straight away: the old skeleton flash made every tap
    feel like a page reload. */
 if(a==='admin-tab'){ state.role='restaurant'; state.adminTab=btn.dataset.tab; state.adminSubpage=null; save(); render(); return; }
 if(a==='super-tab'){ state.adminTab=btn.dataset.tab; state.adminSubpage=null; save(); render(); return; }
 if(a==='admin-subpage'){ const p=btn.dataset.page; state.adminSubpage=p; if(ADMIN_SUBPAGES[p]) state.adminTab=ADMIN_SUBPAGES[p].tab; save(); render(); return; }
 if(a==='menu-tab'){ setMenuTab(btn.dataset.tab); save(); render(); return; }
 if(a==='subpage-back'){ state.adminSubpage=null; render(); return; }
 if(a==='toggle-category'){ ui.expandedCategory=ui.expandedCategory===btn.dataset.id?null:btn.dataset.id; render(); return; }
 if(a==='open-add-item'){ if(!state.categories.length){ ui.sheet='addCategory'; ui.sheetData={}; toast('Add a category first'); render(); return; } ui.sheet='addItem'; ui.sheetData={category:btn.dataset.category||ui.expandedCategory||state.categories[0].id}; render(); return; }
 if(a==='open-add-category'){ ui.sheet='addCategory'; ui.sheetData={}; render(); return; }
 if(a==='add-chooser'){ ui.sheet='addChooser'; ui.sheetData={}; render(); return; }
 if(a==='rename-category'){ ui.sheet='renameCategory'; ui.sheetData={id:btn.dataset.id}; render(); return; }
 if(a==='save-rename-category'){ saveRenameCategoryForm(); return; }
 if(a==='move-category'){ moveCategory(btn.dataset.id,btn.dataset.dir); return; }
 if(a==='delete-category'){ deleteCategory(btn.dataset.id); return; }
 if(a==='duplicate-item'){ duplicateItem(btn.dataset.id); return; }
 if(a==='go-landing'){ state.mode='landing'; ui.sheet=null; ui.modal=null; if(state.tour&&state.tour.active) state.tour={active:false,step:0,done:state.tour.done}; save(); render(); return; }
 if(a==='open-auth'){ ui.sheet='auth'; ui.sheetData={mode:btn.dataset.mode||'signup'}; render(); return; }
 if(a==='auth-mode'){ ui.sheetData={mode:btn.dataset.mode}; render(); return; }
 if(a==='auth-submit'){ const f=document.getElementById('auth-form'); const email=f?String(new FormData(f).get('email')||'').trim():''; ui.sheet=null; ui.sheetData=null; state.mode='admin'; state.role='restaurant'; state.adminTab='home'; state.adminSubpage=null; save(); render(); toast(email?`Signed in as ${email}`:'Signed in to the demo workspace'); return; }
 if(a==='open-demo'){ state.mode='admin'; state.role='restaurant'; state.adminTab='home'; state.adminSubpage=null; ui.sheet=null; if(state.tour&&!state.tour.done) state.tour={active:true,step:0,done:false}; save(); render(); return; }
 if(a==='open-guest-menu'){ openPublicMenu(); return; }

 if(a==='edit-item'){ ui.sheet='editItem'; ui.sheetData={id:btn.dataset.id}; render(); return; }
 if(a==='promote-item'){ ui.sheet='promote'; ui.sheetData={id:btn.dataset.id,temp:null}; render(); return; }
 if(a==='cycle-status'){ const f=getItem(btn.dataset.id); if(f){ const before=f.item.status; f.item.status=before==='available'?'soldout':before==='soldout'?'hidden':'available'; logActivity('Changed availability','item',f.item.name,before,f.item.status); save(); toast(`Status: ${f.item.status}`); render(); } return; }
 if(a==='move-item'){ moveItem(btn.dataset.id,btn.dataset.dir); return; }
 if(a==='delete-item'){ deleteItem(btn.dataset.id); return; }
 if(a==='save-item-form'){ saveEditItemForm(); return; }
 /* Variants are edited in place: the rows currently on screen are folded back
    into the item before the sheet re-renders, so nothing typed is lost. */
 if(a==='item-price-mode'){ const f=getItem(btn.dataset.id); if(!f) return; const form=document.getElementById('edit-item-form'); if(form) syncVariantDraft(f.item,form);
  if(btn.dataset.mode==='variants'){ if(!hasVariants(f.item)) f.item.variants=[{name:'Small',price:itemPrice(f.item)||0},{name:'Large',price:Math.round((itemPrice(f.item)||0)*1.4)}]; }
  else { f.item.price=itemPrice(f.item); f.item.variants=[]; }
  save(); render(); return; }
 if(a==='variant-add'){ const f=getItem(btn.dataset.id); if(!f) return; const form=document.getElementById('edit-item-form'); if(form) syncVariantDraft(f.item,form); f.item.variants=[...draftVariants(f.item),{name:'',price:0}]; save(); render(); return; }
 if(a==='variant-remove'){ const f=getItem(btn.dataset.id); if(!f) return; const form=document.getElementById('edit-item-form'); if(form) syncVariantDraft(f.item,form); const idx=Number(btn.dataset.idx); const list=draftVariants(f.item).filter((_,i)=>i!==idx); f.item.variants=list; if(!list.length) f.item.price=itemPrice(f.item); save(); render(); return; }
 if(a==='save-add-item'){ saveAddItemForm(); return; }
 if(a==='save-add-category'){ saveAddCategoryForm(); return; }
  if(a==='end-promotion'){ endPromotion(btn.dataset.kind||'item',btn.dataset.id); return; }
  if(a==='pause-promotion'){ pausePromotion(btn.dataset.kind||'item',btn.dataset.id); return; }
  if(a==='resume-promotion'){ resumePromotion(btn.dataset.kind||'item',btn.dataset.id); return; }
  if(a==='promo-segment'){ ui.promoSegment=btn.dataset.segment; render(); return; }
  if(a==='promo-temp'){ ui.sheetData.temp={...(ui.sheetData.temp||{}),[btn.dataset.key]:btn.dataset.value}; ui.sheetData.error=null; render(); return; }
  if(a==='promo-day'){ const temp={...(ui.sheetData.temp||{})}; const day=Number(btn.dataset.day); const days=Array.isArray(temp.days)?temp.days.map(Number):[0,1,2,3,4,5,6];
   temp.days=days.includes(day)?days.filter(d=>d!==day):[...days,day].sort((x,y)=>x-y);
   if(!temp.days.length) temp.days=[day];
   ui.sheetData.temp=temp; render(); return; }
  if(a==='save-promotion'){ savePromotion(btn.dataset.id); return; }
  if(a==='promo-chooser'){ ui.sheet='promoChooser'; ui.sheetData={}; render(); return; }
  if(a==='promote-category'){ ui.sheet='promoteCategory'; ui.sheetData={id:btn.dataset.id,temp:null}; render(); return; }
  if(a==='save-category-promotion'){ saveCategoryPromotion(btn.dataset.id); return; }

 if(a==='bulk-availability'){ ui.sheet='bulkAvailability'; ui.sheetData={temp:{}}; render(); return; }
 if(a==='bulk-price'){ ui.sheet='bulkPrice'; ui.sheetData={}; render(); return; }
 if(a==='bulk-toggle'){ const id=btn.dataset.id; const f=getItem(id); if(!f) return; const temp={...((ui.sheetData&&ui.sheetData.temp)||{})}; const cur=temp[id]??f.item.status; temp[id]=cur==='soldout'?'available':'soldout'; ui.sheetData={...(ui.sheetData||{}),temp}; render(); return; }
 if(a==='save-bulk-availability'){ const temp=(ui.sheetData&&ui.sheetData.temp)||{}; let n=0; for(const [id,status] of Object.entries(temp)){ const f=getItem(id); if(!f||f.item.status===status) continue; logActivity('Changed availability','item',f.item.name,f.item.status,status); f.item.status=status; n++; } save(); ui.sheet=null; ui.sheetData=null; toast(n?`${n} ${n===1?'dish':'dishes'} updated`:'Nothing changed'); render(); return; }
 if(a==='item-actions'){ ui.sheet='itemActions'; ui.sheetData={id:btn.dataset.id}; render(); return; }
 if(a==='move-item-up'){ moveItem(btn.dataset.id,'up'); return; }
 if(a==='move-item-down'){ moveItem(btn.dataset.id,'down'); return; }
 if(a==='appearance'){
  const key=btn.dataset.key, value=btn.dataset.value;
  /* Template taps never re-render the page: rebuilding the strip would reset
     its scroll position (the flash back to the first card). Selection only
     toggles classes on the cards that are already in the DOM. */
  if(key==='template'){
   state.appearance.template=normalizeTemplate(value);
   applyTemplateDefaults(state.appearance,state.appearance.template);
   save(); selectTemplateCard(state.appearance.template); return;
  }
  state.appearance[key]=value; save();
  render(); return;
 }
 if(a==='palette'){
  state.appearance.palette=btn.dataset.value;
  state.appearance.brand=paletteOf(state.appearance.palette).light.brand;
  save();
  markPicker('.palette-scroll',state.appearance.palette,'.palette-dots');
  refreshBackgroundCards();
  const note=document.querySelector('.custom-color-note'); if(note) note.textContent='Or pick your own colour';
  toast(`${paletteOf(state.appearance.palette).name} palette applied`);
  return;
 }
 if(a==='background'){
  state.appearance.background=btn.dataset.value; save();
  markPicker('.background-scroll',state.appearance.background,null);
  return;
 }
 if(a==='brand-color'){ state.appearance.brand=btn.dataset.color; save(); render(); return; }
 if(a==='pick-template'){ state.appearance.template=normalizeTemplate(btn.dataset.value); applyTemplateDefaults(state.appearance,state.appearance.template); save(); toast(`${templateOf(state.appearance.template).name} applied`); render(); return; }
 if(a==='qr-style'){ state.qrStyle=btn.dataset.style; save(); render(); return; }
 if(a==='download-qr'){ downloadLiveQr(); return; }
 if(a==='share-preview'){ sharePreview(); return; }
 if(a==='toggle-hours'){ ui.hoursOpen=!ui.hoursOpen; render(); return; }
 if(a==='language-sheet'){ ui.sheet='language'; render(); return; }
 if(a==='info-sheet'){ ui.sheet='info'; render(); return; }
 if(a==='close-sheet'){ ui.sheet=null; ui.sheetData=null; render(); return; }
 if(a==='select-language'){ state.preview.language=btn.dataset.lang; state.preview.languageConfirmed=true; ui.sheet=null; track('language_change',{lang:btn.dataset.lang}); save(); render(); if(!state.preview.promoSeen&&getPromoted()){ setTimeout(()=>{ui.modal='special';state.preview.promoSeen=true;save();render();},1400);} return; }
 if(a==='close-modal'){ ui.modal=null; state.preview.promoSeen=true; save(); render(); return; }
 if(a==='view-special'){ const id=btn.dataset.id; ui.modal=null; render(); setTimeout(()=>document.querySelector(`[data-item-id="${CSS.escape(id)}"]`)?.scrollIntoView({behavior:preferredScrollBehavior(),block:'center'}),80); return; }
 if(a==='jump-category'){ setActiveCategory(btn.dataset.id); scrollToCategory(btn.dataset.id); track('category_expand',{id:btn.dataset.id}); return; }
 if(a==='scroll-item'){ document.querySelector(`[data-item-id="${CSS.escape(btn.dataset.id)}"]`)?.scrollIntoView({behavior:preferredScrollBehavior(),block:'center'}); return; }
 if(a==='reset-demo'){ showConfirm({title:'Reset all prototype changes?',body:'This restores the original Sofra demo and clears any edits you made.',label:'Reset demo',tone:'danger',run(){ Data.restaurants.remove(ACTIVE_SLUG); state=defaultState(); ui={sheet:null,sheetData:null,modal:null,expandedCategory:'popular',menuSearch:'',superSearch:'',languageSearch:'',editingItem:null,adminSearch:'',menuFilter:'all',superFilter:'all',userFilter:'all',subId:null,userSearch:'',confirm:null,skeleton:false,lastFocus:null}; save(); toast('Demo restored'); render(); }}); return; }
 if(a==='replay-onboarding'||a==='tour-start'){ startTour(); return; }
 if(a==='new-customer'){ state.preview.languageConfirmed=false; state.preview.promoSeen=false; state.preview.strongDismissed=false; state.mode='preview'; ui.sheet=null;ui.modal=null;save();render();return; }
 if(a==='tour-skip'){ endTour(false); return; }
 if(a==='tour-next'){ tourNext(); return; }
 if(a==='tour-back'){ tourBack(); return; }
 if(a==='restaurant-detail'){ ui.sheet='restaurantDetail';ui.sheetData={id:btn.dataset.id};render();return; }
 if(a==='open-sheet'){ ui.sheet=btn.dataset.sheet; ui.sheetData={id:btn.dataset.id,rid:btn.dataset.rid,cid:btn.dataset.cid,iid:btn.dataset.iid}; render(); return; }
 if(a==='confirm-action'){ const c=ui.confirm; ui.confirm=null; if(c&&c.run){ c.run(); } else { render(); } return; }
 if(a==='confirm-cancel'){ ui.confirm=null; render(); return; }
 if(a==='toggle-open'){ state.restaurant.status=state.restaurant.status==='Open'?'Closed':'Open'; save(); toast(state.restaurant.status==='Open'?'Open now':'Closed now'); render(); return; }
 if(a==='toggle-hide-soldout'){ state.hideSoldOut=!state.hideSoldOut; save(); render(); return; }
  if(a==='menu-filter'){ ui.menuFilter=btn.dataset.filter; render(); return; }
 /* Tabs and the density toggle only change what is drawn, never the data. */
 if(a==='settings-tab'){ ui.settingsTab=btn.dataset.tab; render(); return; }
 if(a==='insights-tab'){ ui.insightsTab=btn.dataset.tab; render(); return; }
 if(a==='items-density'){ ui.itemsGrid=ui.itemsGrid==='grid'?'list':'grid'; render(); return; }
 if(a==='jump-category'){ const id=btn.dataset.id; ui.expandedCategory=id; render(); requestAnimationFrame(()=>{ const node=document.getElementById(`cat-${id}`); if(node) node.scrollIntoView({block:'start',behavior:preferredScrollBehavior()}); }); return; }
 if(a==='item-soldout'||a==='item-hidden'){
  const f=getItem(btn.dataset.id); if(!f) return;
  const target=a==='item-soldout'?'soldout':'hidden';
  const before=f.item.status;
  f.item.status = before===target ? 'available' : target;
  logActivity('Changed availability','item',f.item.name,before,f.item.status);
  save(); toast(f.item.status==='available'?`${f.item.name} available`:f.item.status==='soldout'?`${f.item.name} marked sold out`:`${f.item.name} hidden`); render(); return;
 }
 if(a==='toggle-conversions'){ const cur=currencyOf(); const before=cur.conversionsEnabled; cur.conversionsEnabled=!before; logActivity('Changed currency conversions','currency','Guest conversions',before?'on':'off',cur.conversionsEnabled?'on':'off'); save(); toast(cur.conversionsEnabled?'Guest conversions on':'Guest conversions off'); render(); return; }
 if(a==='add-rate'){ addGuestCurrency(); return; }
 if(a==='remove-rate'){ const code=btn.dataset.code; showConfirm({title:`Remove ${code}?`,body:'Guests will no longer see prices converted to this currency.',label:`Remove ${code}`,tone:'danger',run(){ const cur=currencyOf(); cur.rates=cur.rates.filter(r=>r.code!==code); save(); toast(`${code} removed`); render(); }}); return; }
 if(a==='move-rate'){ const cur=currencyOf(); const i=cur.rates.findIndex(r=>r.code===btn.dataset.code); const n=btn.dataset.dir==='up'?i-1:i+1; if(i<0||n<0||n>=cur.rates.length) return; [cur.rates[i],cur.rates[n]]=[cur.rates[n],cur.rates[i]]; save(); render(); return; }
 if(a==='currency-sheet'){ ui.sheet='currency'; ui.sheetData={id:btn.dataset.id}; render(); return; }
 if(a==='share-menu'){ sharePreview(); return; }
 if(a==='insights-range'){ ui.insightsRange=btn.dataset.range; render(); return; }
 if(a==='seed-analytics'){ seedAnalytics(); return; }
 if(a==='clear-analytics'){ showConfirm({title:'Clear guest analytics?',body:'Every recorded visit and demo event is deleted. Reporting starts from empty.',label:'Clear analytics',tone:'danger',run(){ Services.insights.clear(); toast('Analytics cleared'); render(); }}); return; }
 if(a==='diet-filter'){ ui.dietFilter=btn.dataset.diet; if(btn.dataset.diet&&btn.dataset.diet!=='all') track('filter_diet',{diet:btn.dataset.diet}); render(); return; }
 if(a==='allergen-sheet'){ ui.sheet='allergens'; track('filter_allergen',{code:btn.dataset.code||'guide'}); render(); return; }
 if(a==='filters-sheet'){ ui.sheet='filters'; render(); return; }
 if(a==='item-details'){ ui.sheet='itemDetails'; ui.sheetData={id:btn.dataset.id}; render(); return; }
 if(a==='display-currency'){ ui.sheet='displayCurrency'; render(); return; }
 if(a==='set-display-currency'){ ui.displayCurrency=btn.dataset.code; ui.sheet=null; render(); return; }
 if(a==='pick-translation-language'){ ui.transLang=btn.dataset.lang; render(); return; }
 if(a==='toggle-menu-language'){ toggleMenuLanguage(btn.dataset.lang); return; }
 if(a==='auto-translate'){ autoTranslate(btn.dataset.lang); return; }
 if(window.HapOps && HapOps.actions(a, btn, opsCtx())) return;
});

app.addEventListener('change',e=>{
 const el=e.target;
 if(el.matches('[data-action="bulk-price-input"]')){ const f=getItem(el.dataset.id); if(f){ const v=Number(el.value); if(isFinite(v)&&v>0){ const before=f.item.price; f.item.price=v; if(before!==v) logActivity('Changed price','item',f.item.name,String(before),String(v)); save(); } } return; }
 /* Inline price edit in the item list: saves in place, no re-render, so the
    open category and the scroll position survive the edit. */
 if(el.matches('[data-action="item-price-input"]')){
  const f=getItem(el.dataset.id); if(!f) return;
  const v=Number(el.value);
  if(!isFinite(v)||v<=0){ el.value=String(f.item.price); toast('Enter a price above zero'); return; }
  const before=f.item.price;
  f.item.price=v;
  if(before!==v){ logActivity('Changed price','item',f.item.name,String(before),String(v)); save(); toast(`${f.item.name} · ${itemPriceLabel(f.item)}`); }
  const label=el.closest('.admin-item')?.querySelector('.admin-item-copy > span');
  if(label){ const st=f.item.status; const stl=st==='available'?'Available':st==='soldout'?'Sold out':'Hidden'; label.innerHTML=`<i class="status-dot ${st}"></i>${stl} · ${itemPriceLabel(f.item)}`; }
  return;
 }
 if(el.matches('[data-action="promo-temp-input"]')){ const key=el.dataset.key; let value=el.value;
  if(key==='startAt'||key==='endAt') value=value?new Date(value).getTime():null;
  ui.sheetData.temp={...(ui.sheetData.temp||{}),[key]:value};
  if(key==='startAt'||key==='endAt'){ ui.sheetData.error=null; render(); }
  return; }
 if(el.matches('[data-action="brand-custom"]')){ state.appearance.brand=el.value; state.appearance.palette='custom'; save(); markPicker('.palette-scroll','custom','.palette-dots'); refreshBackgroundCards(); const note=document.querySelector('.custom-color-note'); if(note) note.textContent='Custom colour in use'; return; }
 if(el.matches('[data-action="set-primary-currency"]')){ setPrimaryCurrency(el.value); return; }
 if(el.matches('[data-action="pick-translation-language"]')){ ui.transLang=el.value; render(); return; }
 if(el.matches('[data-setting]')){ state.restaurant[el.dataset.setting]=el.value; save(); toast('Saved'); return; }
});
app.addEventListener('input',e=>{
 if(e.target.matches('[data-rate]')){ handleRateInput(e.target); return; }
 if(e.target.matches('[data-tr-id]')){ handleTranslationInput(e.target); return; }
 if(e.target.id==='language-search'){ ui.languageSearch=e.target.value; const pos=e.target.selectionStart; render(); const n=document.getElementById('language-search'); if(n){n.focus();n.setSelectionRange(pos,pos);} }
 if(e.target.id==='super-search'){ ui.superSearch=e.target.value; const pos=e.target.selectionStart; render(); const n=document.getElementById('super-search'); if(n){n.focus();n.setSelectionRange(pos,pos);} }
 if(e.target.id==='user-search'){ ui.userSearch=e.target.value; const pos=e.target.selectionStart; render(); const n=document.getElementById('user-search'); if(n){n.focus();n.setSelectionRange(pos,pos);} }
 if(e.target.id==='admin-search'){ ui.adminSearch=e.target.value; const pos=e.target.selectionStart; render(); const n=document.getElementById('admin-search'); if(n){n.focus();n.setSelectionRange(pos,pos);} }
});
function clearFieldErrors(form){
 form.querySelectorAll('.field-error').forEach(n=>n.remove());
 form.querySelectorAll('[aria-invalid]').forEach(n=>n.removeAttribute('aria-invalid'));
}
function markFieldError(form,name,message,focus){
 const el=form.querySelector(`[name="${name}"]`); if(!el) return;
 el.setAttribute('aria-invalid','true');
 const note=document.createElement('p'); note.className='field-error'; note.textContent=message;
 (el.closest('.field')||el).insertAdjacentElement('beforeend',note);
 if(focus) el.focus();
}
/** Reads the variant rows currently typed into an item form. */
function formVariants(form){
 const rows=[...form.querySelectorAll('.variant-row')];
 return rows.map((row,idx)=>({
  name:String(row.querySelector('[name="variantName"]')?.value||'').trim()||`Option ${idx+1}`,
  price:Number(row.querySelector('[name="variantPrice"]')?.value)||0
 }));
}
/** Every variant row as typed, including rows still missing a name. */
function draftVariants(i){ return Array.isArray(i&&i.variants)?i.variants.filter(v=>v&&typeof v==='object'):[]; }
/** Reads the raw variant rows without inventing names for blank ones. */
function rawFormVariants(form){
 return [...form.querySelectorAll('.variant-row')].map(row=>({
  name:String(row.querySelector('[name="variantName"]')?.value||'').trim(),
  price:Number(row.querySelector('[name="variantPrice"]')?.value)||0
 }));
}
/** Folds what is currently typed in the item form back into the item, so a
    re-render (adding or removing a variant row) never loses input. */
function syncVariantDraft(item,form){
 if(!item||!form) return;
 const fd=new FormData(form);
 if(fd.has('name')) item.name=String(fd.get('name')||'').trim()||item.name;
 if(fd.has('ingredients')) item.ingredients=String(fd.get('ingredients')||'').trim();
 const rows=rawFormVariants(form);
 if(rows.length) item.variants=rows;
 else {
  const raw=String(fd.get('price')??'').trim();
  if(raw!=='') item.price=Number(raw)||0;
 }
}
/** Inline field validation shared by the add and edit item forms. */
function validateItemForm(form){
 clearFieldErrors(form);
 const fd=new FormData(form);
 const name=String(fd.get('name')||'').trim();
 const errors=[];
 if(!name) errors.push(['name','Give the dish a name guests will recognise.']);
 const variants=formVariants(form);
 if(variants.length){
  if(variants.some(v=>!(v.price>0))) errors.push(['variantPrice','Every variant needs a price above zero.']);
 } else {
  const rawPrice=String(fd.get('price')??'').trim();
  const price=Number(rawPrice);
  if(rawPrice==='') errors.push(['price','Add a price.']);
  else if(!Number.isFinite(price)) errors.push(['price','Use numbers only, for example 850.']);
  else if(price<=0) errors.push(['price','The price must be greater than zero.']);
 }
 errors.forEach(([field,message],i)=>markFieldError(form,field,message,i===0));
 return errors.length===0;
}
function readItemFields(form){
 const fd=new FormData(form);
 const status=String(fd.get('status')||'');
 return {
  name:String(fd.get('name')||'').trim(),
  ingredients:String(fd.get('ingredients')||'').trim(),
  price:Number(fd.get('price'))||0,
  allergens:fd.getAll('allergens').map(String),
  dietary:fd.getAll('dietary').map(String),
  spice:Number(fd.get('spice'))||0,
  category:String(fd.get('category')||''),
  status:STATUS_OPTIONS.some(s=>s[0]===status)?status:'available',
  image:fd.get('image')
 };
}
function saveEditItemForm(){
 const form=document.getElementById('edit-item-form'); if(!form) return;
 const id=new FormData(form).get('id'); const f=getItem(id); if(!f) return; const oldCat=f.category;
 if(!validateItemForm(form)) return;
 const v=readItemFields(form);
 const oldName=f.item.name, oldPrice=itemPrice(f.item), oldStatus=f.item.status;
 Object.assign(f.item,{name:v.name,ingredients:v.ingredients,price:v.price,allergens:v.allergens,dietary:v.dietary,spice:v.spice,status:v.status});
 const vs=formVariants(form);
 if(vs.length){ f.item.variants=vs; f.item.price=itemPrice(f.item); } else { f.item.variants=[]; }
 if(v.image) f.item.image=v.image;
 const newCat=state.categories.find(c=>c.id===v.category); if(newCat&&newCat!==oldCat){ oldCat.items=oldCat.items.filter(x=>x.id!==f.item.id); newCat.items.push(f.item); ui.expandedCategory=newCat.id; }
 if(oldStatus!==v.status) logActivity('Changed availability','item',f.item.name,oldStatus,v.status);
 if(oldPrice!==f.item.price) logActivity('Changed price','item',f.item.name,money(oldPrice),money(f.item.price));
 else logActivity('Updated item','item',f.item.name,oldName,f.item.name);
 save(); ui.sheet=null; toast('Item updated'); render();
}
function saveAddItemForm(){
 const form=document.getElementById('add-item-form'); if(!form) return;
 if(!validateItemForm(form)) return;
 const v=readItemFields(form);
 const cat=state.categories.find(c=>c.id===v.category)||state.categories[0];
 const id='item-'+Date.now();
 cat.items.push({id,name:v.name,ingredients:v.ingredients,price:v.price,image:v.image||PHOTO_PRESETS[0][0],status:v.status,allergens:v.allergens,dietary:v.dietary,spice:v.spice,i18n:{},promotion:{active:false}});
 logActivity('Added item','item',v.name);
 save(); ui.sheet=null; ui.expandedCategory=cat.id; toast('Item added'); render();
}
function saveAddCategoryForm(){
 const form=document.getElementById('add-category-form'); if(!form) return; const fd=new FormData(form); const name=String(fd.get('name')||'').trim();
 clearFieldErrors(form);
 if(!name){ markFieldError(form,'name','Give the category a name.',true); return; }
 const id=(name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'category')+'-'+Date.now().toString().slice(-4); state.categories.push({id,name,items:[]});
 save(); ui.sheet=null; ui.expandedCategory=id; toast('Category added'); render();
}
function saveRenameCategoryForm(){
 const form=document.getElementById('rename-category-form'); if(!form) return;
 const fd=new FormData(form); const c=state.categories.find(x=>x.id===String(fd.get('id')));
 const name=String(fd.get('name')||'').trim();
 if(!c) return;
 clearFieldErrors(form);
 if(!name){ markFieldError(form,'name','Give the category a name.',true); return; }
 const before=c.name; c.name=name;
 logActivity('Renamed category','category',name,before,name);
 save(); ui.sheet=null; toast('Category renamed'); render();
}
function moveCategory(id,dir){
 const idx=state.categories.findIndex(c=>c.id===id); if(idx<0) return;
 const next=dir==='up'?idx-1:idx+1; if(next<0||next>=state.categories.length) return;
 const arr=state.categories; [arr[idx],arr[next]]=[arr[next],arr[idx]];
 logActivity('Reordered category','category',arr[next].name);
 save(); render();
}
function deleteCategory(id){
 const idx=state.categories.findIndex(c=>c.id===id); if(idx<0) return;
 if(state.categories.length<=1){ toast('Your menu needs at least one category'); return; }
 const snapshot=state.categories[idx]; const count=snapshot.items.length;
 showConfirm({
  title:`Delete “${snapshot.name}”?`,
  body:count?`This category still holds ${count} ${count===1?'dish':'dishes'}. Deleting it removes ${count===1?'that dish':'those dishes'} from the menu too. You can undo it right after.`:'This category is empty. You can undo it right after.',
  label:'Delete category',tone:'danger',
  run(){
   state.categories=state.categories.filter(c=>c.id!==id);
   if(ui.expandedCategory===id) ui.expandedCategory=(state.categories[0]||{}).id||null;
   
   logActivity('Deleted category','category',snapshot.name);
   save(); ui.sheet=null;
   toastUndo('Category deleted',()=>{ state.categories.splice(Math.min(idx,state.categories.length),0,snapshot); logActivity('Restored category','category',snapshot.name); save(); toast('Delete undone'); render(); });
   render();
  }
 });
}
function duplicateItem(id){
 const found=getItem(id); if(!found) return;
 const {item,category}=found;
 const copy={...item,id:'item-'+Date.now(),name:`${item.name} (copy)`,promotion:{active:false},allergens:[...itemAllergens(item)],dietary:[...itemDiets(item)],i18n:{}};
 const idx=category.items.findIndex(i=>i.id===id);
 category.items.splice(idx+1,0,copy);
 logActivity('Duplicated item','item',copy.name);
 save(); ui.sheet='editItem'; ui.sheetData={id:copy.id}; ui.expandedCategory=category.id; toast('Item duplicated'); render();
}

app.addEventListener('submit',e=>{ e.preventDefault(); if(e.target.id==='edit-item-form') saveEditItemForm(); if(e.target.id==='add-item-form') saveAddItemForm(); if(e.target.id==='add-category-form') saveAddCategoryForm(); if(e.target.id==='rename-category-form') saveRenameCategoryForm(); });

function moveItem(id,dir){ const f=getItem(id);if(!f)return;const arr=f.category.items;const idx=arr.findIndex(x=>x.id===id);const next=dir==='up'?idx-1:idx+1;if(next<0||next>=arr.length)return;[arr[idx],arr[next]]=[arr[next],arr[idx]];save();render(); }

function deleteItem(id){
 const found=getItem(id); if(!found) return;
 const cat=found.category, snapshot=found.item, idx=cat.items.findIndex(i=>i.id===id);
 showConfirm({title:'Delete this item?',body:'This removes it from the menu immediately. You can undo it right after.',label:'Delete item',tone:'danger',run(){
  cat.items=cat.items.filter(i=>i.id!==id);
  logActivity('Deleted item','item',snapshot.name);
  save(); ui.sheet=null;
  toastUndo('Item deleted',()=>{ cat.items.splice(Math.max(0,idx),0,snapshot); logActivity('Restored item','item',snapshot.name); save(); toast('Delete undone'); render(); });
  render();
 }});
}
/* Several promotions may run at once. Nothing is switched off automatically —
   past three the admin gets a soft warning instead of a hard block. */
function savePromotion(id){ const f=getItem(id);if(!f)return;
 const temp=ui.sheetData.temp||{};
 const wasRaw=String(temp.wasPrice??'').trim();
 const was=wasRaw===''?null:Number(wasRaw);
 if(was!==null&&(!isFinite(was)||was<=0)){ toast('Was-price must be a number above zero'); return; }
 if(was!==null&&was<=Number(f.item.price)){ toast('Was-price should be higher than the current price'); return; }
 const intensity=temp.intensity||'normal';
 const clash=promoConflict('item',id,{intensity});
 if(clash){ ui.sheetData.error=`${clash} is already running as a strong promotion. End it first, or set this one to Subtle or Normal.`; render(); return; }
 const schedule=draftPromotion(temp);
 const res=Services.promotions.save('item',id,{...schedule,intensity,label:temp.label||"Tonight's Pick",style:PROMO_STYLES.some(s=>s[0]===temp.style)?temp.style:'framed',wasPrice:was,terms:String(temp.terms||'').trim()});
 if(res.status!=='ok'){ ui.sheetData.error='Could not save this promotion.'; render(); return; }
 state.preview.promoSeen=false;
 logActivity('Published promotion','item',f.item.name,'off',promoStatus(f.item.promotion));
 save();ui.sheet=null;ui.sheetData=null;
 const count=itemPromotions().length;
 const status=promoStatus(f.item.promotion);
 toast(status==='scheduled'?'Promotion scheduled':count>3?`${count} promotions active — the menu stops feeling special`:'Promotion is live in Preview');
 render(); }
/* Category promotions are first-class and stored per category. */
function saveCategoryPromotion(id){ const c=state.categories.find(x=>x.id===id); if(!c) return;
 const temp=ui.sheetData.temp||{};
 const clash=promoConflict('category',id,{});
 if(clash){ ui.sheetData.error=`${clash} is already featured. Only one section can take over the menu at a time.`; render(); return; }
 const schedule=draftPromotion(temp);
 Services.promotions.save('category',id,{...schedule,label:String(temp.label||'Featured tonight').trim()||'Featured tonight',tint:CATEGORY_TINTS.some(t=>t[0]===temp.tint)?temp.tint:'brand'});
 logActivity('Published promotion','category',c.name,'off',promoStatus(c.promotion));
 save();ui.sheet=null;ui.sheetData=null;
 toast(promoStatus(c.promotion)==='scheduled'?`${c.name} is scheduled`:`${c.name} is featured`);render(); }
function promotionTarget(kind,id){
 if(kind==='category') return state.categories.find(x=>x.id===id)||null;
 const f=getItem(id); return f?f.item:null;
}
function pausePromotion(kind,id){
 const res=Services.promotions.pause(kind,id);
 if(res.status!=='ok') return;
 const target=promotionTarget(kind,id);
 logActivity('Paused promotion',kind,target?target.name:id,'active','paused');
 toastUndo('Promotion paused',()=>{ Services.promotions.resume(kind,id); render(); });
 render();
}
function resumePromotion(kind,id){
 const res=Services.promotions.resume(kind,id);
 if(res.status!=='ok') return;
 const target=promotionTarget(kind,id);
 logActivity('Resumed promotion',kind,target?target.name:id,'paused','active');
 toast('Promotion resumed');
 render();
}
function endPromotion(kind,id){
 const target=promotionTarget(kind,id);
 if(!target) return;
 const isCat=kind==='category';
 showConfirm({
  title:isCat?`Stop featuring ${target.name}?`:`Disable promotion on ${target.name}?`,
  body:isCat?'The section stays on the menu, it just loses the featured treatment.':'The dish stays on the menu, but it will no longer be featured to guests.',
  label:'End promotion',tone:'danger',
  run(){
   const res=Services.promotions.end(kind,id);
   if(res.status!=='ok') return;
   logActivity('Ended promotion',kind,target.name,'active','off');
   ui.sheet=null; ui.sheetData=null;
   toast('Promotion ended — it moves to Past');
   render();
  }
 });
}


// Offline QR encoder for the live deployed Preview URL.
// Fixed QR Version 5-L (37x37), byte mode. This keeps the Netlify package dependency-free.
function qrGalois(){
 const exp=new Array(512),log=new Array(256); let x=1;
 for(let i=0;i<255;i++){exp[i]=x;log[x]=i;x<<=1;if(x&0x100)x^=0x11d;}
 for(let i=255;i<512;i++)exp[i]=exp[i-255]; return {exp,log};
}
const QR_GF=qrGalois();
function qrMul(a,b){ if(a===0||b===0)return 0; return QR_GF.exp[QR_GF.log[a]+QR_GF.log[b]]; }
function qrGenerator(degree){ let g=[1]; for(let i=0;i<degree;i++){ const next=new Array(g.length+1).fill(0); for(let j=0;j<g.length;j++){next[j]^=g[j];next[j+1]^=qrMul(g[j],QR_GF.exp[i]);} g=next;} return g; }
function qrEcc(data,degree=26){ const gen=qrGenerator(degree),res=new Array(degree).fill(0); for(const byte of data){const factor=byte^res[0];res.shift();res.push(0);for(let j=0;j<degree;j++)res[j]^=qrMul(gen[j+1],factor);}return res; }
function qrBitsToBytes(url){
 const bytes=[...new TextEncoder().encode(url)]; if(bytes.length>104) throw new Error('Preview URL is too long for the prototype QR');
 const bits=[]; const push=(val,len)=>{for(let i=len-1;i>=0;i--)bits.push((val>>>i)&1);};
 push(0b0100,4); push(bytes.length,8); bytes.forEach(b=>push(b,8));
 const cap=108*8; for(let i=0;i<4&&bits.length<cap;i++)bits.push(0); while(bits.length%8)bits.push(0);
 const out=[]; for(let i=0;i<bits.length;i+=8){let b=0;for(let j=0;j<8;j++)b=(b<<1)|(bits[i+j]||0);out.push(b);} let pad=0; while(out.length<108){out.push(pad++%2===0?0xec:0x11);} return out;
}
function qrBchDigit(data){let d=0;while(data!==0){d++;data>>>=1;}return d;}
function qrFormatInfo(mask){ let data=(1<<3)|mask; let d=data<<10; const g=0x537; while(qrBchDigit(d)-qrBchDigit(g)>=0)d^=g<<(qrBchDigit(d)-qrBchDigit(g)); return ((data<<10)|d)^0x5412; }
function qrMatrix(url){
 const n=37,m=Array.from({length:n},()=>Array(n).fill(null));
 const finder=(row,col)=>{for(let r=-1;r<=7;r++)for(let c=-1;c<=7;c++){const y=row+r,x=col+c;if(y<0||y>=n||x<0||x>=n)continue;const dark=r>=0&&r<=6&&c>=0&&c<=6&&(r===0||r===6||c===0||c===6||(r>=2&&r<=4&&c>=2&&c<=4));m[y][x]=dark;}};
 finder(0,0);finder(n-7,0);finder(0,n-7);
 const align=(cy,cx)=>{if(m[cy][cx]!==null)return;for(let r=-2;r<=2;r++)for(let c=-2;c<=2;c++)m[cy+r][cx+c]=Math.abs(r)===2||Math.abs(c)===2||(r===0&&c===0);}; align(30,30);
 for(let i=8;i<n-8;i++){if(m[i][6]===null)m[i][6]=i%2===0;if(m[6][i]===null)m[6][i]=i%2===0;}
 const setFormat=(test)=>{const data=qrFormatInfo(0);for(let i=0;i<15;i++){const mod=!test&&((data>>i)&1)===1;if(i<6)m[i][8]=mod;else if(i<8)m[i+1][8]=mod;else m[n-15+i][8]=mod;if(i<8)m[8][n-i-1]=mod;else if(i<9)m[8][15-i]=mod;else m[8][15-i-1]=mod;}m[n-8][8]=!test;};
 setFormat(true);
 const data=qrBitsToBytes(url),code=data.concat(qrEcc(data,26)); let bit=0,row=n-1,inc=-1;
 for(let col=n-1;col>0;col-=2){if(col===6)col--;while(true){for(let c=0;c<2;c++){const x=col-c;if(m[row][x]===null){let dark=false;if(bit<code.length*8)dark=((code[Math.floor(bit/8)]>>>(7-(bit%8)))&1)===1;if((row+x)%2===0)dark=!dark;m[row][x]=dark;bit++;}}row+=inc;if(row<0||row>=n){row-=inc;inc=-inc;break;}}}
 setFormat(false); return m;
}
function renderLiveQr(){
 const canvas=document.getElementById('live-qr'); if(!canvas)return; const url=publicMenuUrl();
 try{const matrix=qrMatrix(url),quiet=4,size=matrix.length+quiet*2,scale=8;canvas.width=size*scale;canvas.height=size*scale;const ctx=canvas.getContext('2d');ctx.fillStyle='#fffaf2';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#25221f';for(let y=0;y<matrix.length;y++)for(let x=0;x<matrix.length;x++)if(matrix[y][x])ctx.fillRect((x+quiet)*scale,(y+quiet)*scale,scale,scale);canvas.dataset.qrUrl=url;}catch(e){canvas.style.display='none';}
}
function downloadLiveQr(){const canvas=document.getElementById('live-qr');if(!canvas)return;const a=document.createElement('a');a.download=`${state.restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-menu-qr.png`;a.href=canvas.toDataURL('image/png');a.click();toast('QR downloaded');}

/* The public menu keeps its own stable identity: it follows the restaurant
   slug in the URL, not the display name, so renaming never breaks a QR code. */
function publicMenuUrl(){ return location.origin+'/menu/'+menuSlug(); }
async function sharePreview(){ const url=publicMenuUrl(); try{ if(navigator.share) await navigator.share({title:`${state.restaurant.name} menu`,url}); else {await navigator.clipboard.writeText(url);toast('Preview link copied');} }catch(e){} }

// Pathname routing: the requested screen arrives as ?p=. Legacy #preview / #admin
// fragments are translated once so old QR / shared links keep working.
const legacyPath = location.hash==='#preview' ? '/preview' : (location.hash==='#admin' ? '/admin' : null);
const bootPath = QS.get('p') || legacyPath || '/';
applyPath(bootPath);
if(legacyPath){ try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} }
if(PUBLIC_CTX){
 state.mode='preview'; state.tour={active:false,step:0,done:true};
 /* Only a real guest visit opens a session; owner previews are not guests. */
 startGuestSession('public');
 window.addEventListener('pagehide',endGuestSession);
 /* The guest picks their own language on first visit. The choice lives in a
    guest-scoped record so a diner never writes into the restaurant's data. */
 const g=loadGuestPrefs();
 if(g.language && menuLanguages().includes(g.language)){ state.preview.language=g.language; state.preview.languageConfirmed=true; }
 else { state.preview.language=state.restaurant.defaultLanguage||'English'; state.preview.languageConfirmed=false; }
 if(g.displayCurrency) ui.displayCurrency=g.displayCurrency;
 const match = PUBLIC_SLUG && (state.superadmin.restaurants||[]).find(r=>r.id===PUBLIC_SLUG);
 if(match) state.restaurant={...state.restaurant,name:match.name};
}
/* Boot with the requested path, so a legacy URL immediately reports its
   canonical replacement back to the host and the address bar updates. */
lastPath = (String(bootPath).split('?')[0].replace(/\/+$/,'') || '/');

if(!state.tour) state.tour={active:false,step:0,done:false};
// The tour belongs to the admin demo, never to the landing screen or the
// public menu. It starts when someone actually opens the demo.
if(state.tour.active && state.mode!=='admin') state.tour={active:false,step:0,done:state.tour.done};
if(PUBLIC_CTX && state.tour.active) state.tour={active:false,step:0,done:state.tour.done};
else if(!PUBLIC_CTX && stripTenant(String(bootPath).split('?')[0].replace(/\/+$/,''))==='/admin' && !state.tour.done && !state.tour.active && state.mode==='admin'){ state.tour={active:true,step:0,done:false}; }


/** Keeps Tab focus inside the topmost overlay (sheet, confirm or modal). */
const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
document.addEventListener('keydown',e=>{
 if(e.key!=='Tab') return;
 if(!(ui.sheet||ui.confirm||ui.modal)) return;
 const overlay=document.querySelector('.confirm-modal')||document.querySelector('.sheet')||document.querySelector('.special-modal');
 if(!overlay) return;
 const nodes=Array.from(overlay.querySelectorAll(FOCUSABLE)).filter(n=>n.offsetParent!==null||n===document.activeElement);
 if(!nodes.length) return;
 const first=nodes[0], last=nodes[nodes.length-1];
 if(!overlay.contains(document.activeElement)){ e.preventDefault(); first.focus(); return; }
 if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
 else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
});

// Close sheets and modals with Escape.
document.addEventListener('keydown',e=>{
 if(e.key!=='Escape') return;
 if(ui.confirm){ ui.confirm=null; render(); }
 else if(ui.sheet){ ui.sheet=null; ui.sheetData=null; render(); }
 else if(ui.modal){ ui.modal=null; render(); }
});

save(); render();

/* The host drives the application through this handle: it pushes route changes
   in and reads the screen the application resolved on boot. */
window.HapRuntime = {
 slug: ACTIVE_SLUG,
 publicContext: PUBLIC_CTX,
 setRoute: applyHostRoute,
 currentPath: currentPath
};

/* A retired /preview URL lands in admin for a frame, then leaves for the
   real public menu. */
if(pendingMenuRedirect && !PUBLIC_CTX) openPublicMenu();

if(!PUBLIC_CTX){
 const boot = currentPath();
 lastPath = boot;
 if(HOST && typeof HOST.onReady==='function'){ try{ HOST.onReady(boot); }catch(e){} }
 else if(window.parent && window.parent!==window){
  /* A standalone frame host may hydrate after this boots, so readiness is
     announced a few times until it answers. */
  let tries=0;
  const hello=()=>{
   if(tries++>6) return;
   try{ window.parent.postMessage({type:'hap:ready',path:currentPath()}, location.origin); }catch(e){}
   setTimeout(hello,200);
  };
  hello();
 }
}
})();
