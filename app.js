const A='assets/media/';
const T='assets/tutorials/';
const LOGO_BLACK='assets/flow-logo-black.png';
const LOGO_WHITE='assets/flow-logo-white.png';

const media=[
  {id:'surf',title:'Surf Session Highlight',type:'Video',file:'MP4',size:'320 MB',duration:'00:28',src:A+'surf_hd.jpg',channel:'Instagram',orientation:'Vertical',collection:'Summer Content Day',position:'50% 46%',description:'High-energy opening asset for social. Use it to introduce the experience with immediate movement.'},
  {id:'portrait',title:'Golden Hour Portrait',type:'Photography',file:'JPG',size:'11.8 MB',src:A+'portrait_hd.jpg',channel:'Website',orientation:'Portrait',collection:'Summer Content Day',position:'50% 35%',description:'Lifestyle portrait for brand storytelling, editorial modules and social posts.'},
  {id:'cliffs',title:'Coastal Overview',type:'Photography',file:'JPG',size:'14.2 MB',src:A+'cliffs_hd.jpg',channel:'Website',orientation:'Landscape',collection:'Summer Content Day',position:'50% 52%',description:'Wide landscape image for web hero sections, campaign pages and destination-led communication.'},
  {id:'shadow',title:'Palm Shadow Detail',type:'Photography',file:'JPG',size:'8.1 MB',src:A+'palm_shadow_hd.jpg',channel:'Instagram',orientation:'Landscape',collection:'Brand Details',position:'50% 48%',description:'Quiet visual detail for pacing a feed, editorial layouts and visual transitions.'},
  {id:'wave',title:'Shoreline Texture',type:'Photography',file:'JPG',size:'12.6 MB',src:A+'wave_hd.jpg',channel:'Design',orientation:'Square',collection:'Brand Details',position:'50% 55%',description:'Textural image suited to graphic compositions, backgrounds and brand-led posts.'},
  {id:'sunset',title:'Sunset Surf Walk',type:'Video',file:'MP4',size:'402 MB',duration:'00:32',src:A+'sunset_hd.jpg',channel:'Instagram',orientation:'Vertical',collection:'Summer Content Day',position:'50% 44%',description:'Slow, atmospheric closing reel. Ideal for seasonal storytelling and retargeting creative.'},
  {id:'palms',title:'Palm Canopy',type:'Photography',file:'JPG',size:'9.4 MB',src:A+'palms_hd.jpg',channel:'Ads',orientation:'Portrait',collection:'Summer Content Day',position:'50% 46%',description:'Bright location cue that can support paid social, stories and supporting campaign frames.'},
  {id:'cove',title:'Turquoise Cove',type:'Video',file:'MP4',size:'285 MB',duration:'00:21',src:A+'cove_hd.jpg',channel:'Website',orientation:'Landscape',collection:'Summer Content Day',position:'50% 53%',description:'Scenic destination asset for website modules, reels and campaign landing pages.'},
  {id:'surf-cut',title:'Surf Cut · 9:16',type:'Video',file:'MP4',size:'196 MB',duration:'00:15',src:A+'surf_hd.jpg',channel:'Ads',orientation:'Vertical',collection:'Paid Social Cutdowns',position:'48% 48%',description:'Short cutdown prepared for paid social placement.'},
  {id:'portrait-social',title:'Lifestyle Portrait · Social',type:'Design',file:'PNG',size:'6.3 MB',src:A+'portrait_hd.jpg',channel:'Instagram',orientation:'Square',collection:'Social Ready',position:'50% 35%',description:'Social-ready crop prepared for organic posting.'},
  {id:'coast-wide',title:'Coast Hero · Wide',type:'Photography',file:'JPG',size:'15.9 MB',src:A+'cliffs_hd.jpg',channel:'Website',orientation:'Landscape',collection:'Website Refresh',position:'50% 58%',description:'Wide crop intended for a website hero or campaign banner.'},
  {id:'cove-ad',title:'Cove Paid Social',type:'Design',file:'PNG',size:'7.2 MB',src:A+'cove_hd.jpg',channel:'Ads',orientation:'Square',collection:'Paid Social Cutdowns',position:'50% 50%',description:'Square paid-social adaptation with space for campaign messaging.'},
];

const collections=[
  {slug:'summer',title:'Summer Content Day',count:42,date:'24 Sep 2026',description:'A focused library around the summer experience campaign.',ids:['surf','portrait','cliffs','palms','sunset','cove'],cover:['surf','portrait','cliffs']},
  {slug:'brand',title:'Brand & Team',count:18,date:'02 Sep 2026',description:'Portraits, details and evergreen brand imagery.',ids:['portrait','shadow','wave','palms'],cover:['portrait','shadow','wave']},
  {slug:'social',title:'Social Ready',count:24,date:'19 Aug 2026',description:'Crops and assets prepared for organic social publishing.',ids:['portrait-social','surf','sunset','wave'],cover:['portrait-social','sunset','wave']},
  {slug:'paid',title:'Paid Social Cutdowns',count:12,date:'08 Aug 2026',description:'Short edits and campaign-ready adaptations for paid media.',ids:['surf-cut','cove-ad','cove'],cover:['surf-cut','cove-ad','cove']},
  {slug:'web',title:'Website Refresh',count:15,date:'22 Jul 2026',description:'Web-first imagery and landscape crops for key website sections.',ids:['coast-wide','cliffs','cove','portrait'],cover:['coast-wide','cove','portrait']},
];

const guides=[
  {id:'download',title:'How to download your content',desc:'Download one asset or an entire collection in a few clicks.',gif:T+'download.gif',poster:T+'download.png',duration:'00:08',steps:['Open the asset or collection you need.','Choose Download.','Your file starts downloading immediately.']},
  {id:'share',title:'Sharing with your team',desc:'Create a simple collection link for colleagues or partners.',gif:T+'share.gif',poster:T+'share.png',duration:'00:07',steps:['Open the collection.','Choose Share collection.','Copy the link and send it to your team.']},
  {id:'filters',title:'Finding the right content',desc:'Use format and channel filters to narrow the library quickly.',gif:T+'filters.gif',poster:T+'filters.png',duration:'00:09',steps:['Open My Content.','Choose a content type or channel.','Combine filters with search when needed.']},
  {id:'use-content',title:'How to use your content map',desc:'See the channel and purpose Flow recommends for each asset.',gif:T+'use-content.gif',poster:T+'use-content.png',duration:'00:08',steps:['Open a collection.','Check the Mini Content Map.','Use the recommendation as a starting point, then adapt it to your campaign.']},
  {id:'reels',title:'Using your Reels',desc:'Quick guidance for getting more from short-form vertical video.',gif:T+'reels.gif',poster:T+'reels.png',duration:'00:10',steps:['Lead with the strongest visual.','Keep the core message in the first few seconds.','Adapt copy and CTA to the channel.']},
  {id:'photos',title:'Using your photos',desc:'Choose the right crop and image type for each channel.',gif:T+'photos.gif',poster:T+'photos.png',duration:'00:09',steps:['Check the recommended channel.','Choose the crop that fits the placement.','Download the final-resolution file.']},
  {id:'collections',title:'How collections work',desc:'Browse campaigns and Content Days as visual collections.',gif:T+'collections.gif',poster:T+'collections.png',duration:'00:08',steps:['Open Collections.','Choose a campaign or Content Day.','Preview, share or download the full collection.']},
];

const icons={
 home:`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></svg>`,
 folder:`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3.5 6.5h6l2 2h9v10a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></svg>`,
 layers:`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></svg>`,
 book:`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22z"/></svg>`,
 search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>`,
 bell:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`,
 chat:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 9 9 0 0 1-4.2-1L3 21l1.5-4.6A8.3 8.3 0 0 1 3 11.5 8.5 8.5 0 1 1 21 11.5Z"/></svg>`,
 light:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M8 14a7 7 0 1 1 8 0c-1 .8-1.3 1.4-1.5 2h-5c-.2-.6-.5-1.2-1.5-2Z"/></svg>`,
 download:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>`,
 share:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/></svg>`,
 play:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
 arrow:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></svg>`,
 close:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 6 12 12M18 6 6 18"/></svg>`,
 check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg>`,
 grid:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
 list:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1" fill="currentColor"/><circle cx="3.5" cy="12" r="1" fill="currentColor"/><circle cx="3.5" cy="18" r="1" fill="currentColor"/></svg>`,
 plus:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>`,
 users:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.5.8 4 3 4 6"/></svg>`,
 upload:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></svg>`
};

let state={
  search:'',contentType:'All',channel:'All',sort:'Newest',view:'grid',drawer:false,notifications:false,
  selectedService:'',selected:new Set(),guide:null,tipVisible:localStorage.getItem('flow-tip-content')!=='dismissed',
  mobileNav:false
};
const app=document.querySelector('#app');

function route(){return location.hash.replace(/^#/,'')||'/login'}
function navTo(path){location.hash=path}
function isAuthed(){return localStorage.getItem('flow-demo-auth')==='1'}
function e(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function getMedia(id){return media.find(m=>m.id===id)||media[0]}
function getCollection(slug){return collections.find(c=>c.slug===slug)||collections[0]}
function icon(name,cls=''){return `<span class="svg ${cls}">${icons[name]||''}</span>`}

function logo(theme='dark',extra=''){
  return `<img class="flow-logo ${extra}" src="${theme==='light'?LOGO_WHITE:LOGO_BLACK}" alt="Flow Productions">`;
}

function sidebar(active='home'){
 const items=[['home','Home','/home','home'],['content','My Content','/content','folder'],['collections','Collections','/collections','layers'],['guides','Guides','/guides','book']];
 return `<aside class="sidebar ${state.mobileNav?'open':''}">
   <button class="brand-btn" data-nav="/home">${logo('dark')}</button>
   <nav class="nav">${items.map(([id,label,url,ic])=>`<button class="nav-item ${active===id?'active':''}" data-nav="${url}">${icon(ic)}<span>${label}</span></button>`).join('')}</nav>
   <div class="sidebar-bottom"><button class="help-card" data-talk>${icon('chat')}<span><b>Made by Flow</b><small>Need help? Talk to us</small></span><span class="tiny-arrow">↗</span></button></div>
 </aside>`
}

function topbar(){return `<header class="topbar">
  <button class="mobile-menu" data-mobile-menu aria-label="Open menu">☰</button>
  <form class="global-search" id="global-search-form">${icon('search')}<input id="global-search-input" value="${e(state.search)}" placeholder="Search your content, collections or guides…" autocomplete="off"></form>
  <div class="topbar-actions"><button class="icon-btn" data-notifications aria-label="Notifications">${icon('bell')}<span class="badge-dot"></span></button><button class="avatar-btn" data-profile><span class="avatar">RF</span><span class="chev">⌄</span></button></div>
</header>`}

function shell(content,active='home'){return `<div class="app-shell">${sidebar(active)}<main class="main">${topbar()}${content}</main></div>${state.drawer?talkDrawer():''}${state.notifications?notificationPopover():''}${state.guide?guideModal(state.guide):''}${state.mobileNav?'<div class="mobile-scrim" data-mobile-menu></div>':''}`}

function loginView(){return `<div class="login-wrap">
  <section class="login-art">
    <div class="login-brand">${logo('light')}</div>
    <div class="login-copy"><div class="eyebrow light">Flow Content Hub</div><h1>Your content.<br>All in one place.</h1><p>A private client space for everything Flow creates for your brand — organised, easy to use and ready whenever you need it.</p></div>
    <div class="login-collage"><figure><img src="${A}surf_hd.jpg"></figure><figure><img src="${A}portrait_hd.jpg"></figure><figure><img src="${A}cliffs_hd.jpg"></figure></div>
    <span class="login-foot">Flow with us.</span>
  </section>
  <section class="login-form-area"><form class="login-form card" id="login-form"><div class="eyebrow">Private client area</div><h2>Welcome back.</h2><p>Sign in to access your content library.</p><div class="field"><label>Email</label><input type="email" value="ricardo@demo.flow" required></div><div class="field"><label>Password</label><input type="password" value="flowdemo" required></div><button class="btn primary wide" type="submit">Log in ${icon('arrow')}</button><div class="demo-note">Demo prototype — any email and password will open the platform.</div></form></section>
</div>`}

function onboardingView(){return shell(`<div class="page onboarding-page">
 <div class="onboarding-hero"><div class="onboarding-copy"><div class="eyebrow">Get started</div><h1>Welcome to your Flow Content Hub.</h1><p>Everything Flow creates for your brand, organised in one visual library. Three quick things and you’re ready.</p></div><div class="onboarding-collage"><img src="${A}cliffs_hd.jpg"><img src="${A}palms_hd.jpg"><img src="${A}portrait_hd.jpg"><span>Your content,<br>all in one place.</span></div></div>
 <div class="onboarding-grid">${onboardCard('1','filters','Browse your content','Find every photo, video and design asset with visual search and filters.')}${onboardCard('2','collections','Open collections','Browse content grouped by campaign, event or Content Day.')}${onboardCard('3','download','Download in seconds','Download one asset or a complete collection whenever you need it.')}</div>
 <div class="onboard-actions"><button class="btn primary large" data-finish-onboarding>Let’s get started ${icon('arrow')}</button><button class="text-btn" data-finish-onboarding>Skip for now</button></div>
 ${flowTip('Your content stays at the centre. Flow can also help with the next step when you need it.','Explore possibilities','talk')}
 </div>`,'home')}
function onboardCard(step,gif,title,desc){return `<article class="onboard-card card"><div class="tutorial-frame">${tutorialImage(gif,title)}</div><div class="onboard-copy-row"><span class="step">${step}</span><div><h3>${title}</h3><p>${desc}</p></div></div></article>`}

function tutorialImage(id,alt){return `<picture><source media="(prefers-reduced-motion: reduce)" srcset="${T}${id}.png"><img loading="lazy" src="${T}${id}.gif" alt="${e(alt)}"></picture>`}

function homeView(){return shell(`<div class="page home-page">
  <header class="page-head home-head"><div class="page-title"><div class="eyebrow">Flow Content Hub</div><h1>Good morning, Ricardo.</h1><p>Everything your brand has created with Flow, ready to use.</p></div><div class="head-actions"><button class="btn ghost" data-talk>${icon('chat')} Ask Flow</button></div></header>
  <section class="section section-tight"><div class="section-head"><div><span class="section-kicker">Latest content</span><h2>Recently added</h2></div><button class="link" data-nav="/content">View all ${icon('arrow')}</button></div><div class="media-grid home-media">${media.slice(0,4).map(mediaCard).join('')}</div></section>
  <section class="section latest-collection">${latestCollectionCard(collections[0])}</section>
  <section class="section"><div class="section-head"><div><span class="section-kicker">Need a hand?</span><h2>Quick guides</h2></div><button class="link" data-nav="/guides">View all guides ${icon('arrow')}</button></div><div class="guide-grid home-guides">${guides.slice(0,3).map(guideCard).join('')}</div></section>
  ${flowTip('We can help turn these assets into social posts, campaigns or website content.','Explore possibilities','talk')}
</div>`,'home')}

function mediaCard(m,selectable=false){
 const selected=state.selected.has(m.id);
 return `<article class="media-card ${selected?'selected':''}" data-asset="${m.id}">
  <div class="thumb"><img src="${m.src}" alt="${e(m.title)}" style="object-position:${m.position||'50% 50%'}">${m.duration?`<span class="duration">${icon('play')}${m.duration}</span>`:''}${selectable?`<button class="select-box ${selected?'on':''}" data-select="${m.id}" aria-label="Select ${e(m.title)}">${selected?icon('check'):''}</button>`:''}<span class="asset-type-badge">${m.type==='Photography'?'Photo':m.type}</span></div>
  <div class="media-card-meta"><div><div class="media-card-title">${m.title}</div><div class="media-card-sub">${m.file} <span>·</span> ${m.size}</div><span class="tag ${tagClass(m.channel)}">${m.channel}</span></div><button class="kebab" data-kebab="${m.id}" aria-label="More options">•••</button></div>
 </article>`
}
function tagClass(channel){return ({Website:'blue',Ads:'orange',Design:'green'}[channel]||'')}

function latestCollectionCard(c){const ms=c.cover.map(getMedia);return `<div class="collection-feature card" data-nav="/collection/${c.slug}"><div class="collection-stack">${ms.map((m,i)=>`<img src="${m.src}" style="object-position:${m.position}">`).join('')}<span class="collection-count">+${c.count-3}</span></div><div class="collection-feature-copy"><div class="eyebrow">Latest collection</div><h3>${c.title}</h3><p>${c.count} assets <span>·</span> Updated ${c.date}</p></div><button class="btn soft">Open collection ${icon('arrow')}</button></div>`}

function flowTip(title,linkText='Explore possibilities',action='talk'){
 const click=action==='talk'?'data-talk':'data-nav="'+action+'"';
 return `<section class="flow-tip card"><div class="flow-tip-icon">${icon('light')}</div><div class="tip-copy"><div class="eyebrow">Flow Tip</div><h3>${title}</h3><button class="link" ${click}>${linkText} ${icon('arrow')}</button></div><div class="tip-visual"><div class="mini-card"><small>Social</small><img src="${A}surf_hd.jpg"></div><div class="mini-card"><small>Campaigns</small><img src="${A}cliffs_hd.jpg"></div><div class="mini-card"><small>Website</small><img src="${A}cove_hd.jpg"></div></div></section>`
}

function guideCard(g){return `<button class="guide-card card" data-guide="${g.id}"><div class="guide-visual">${tutorialImage(g.id,g.title)}<span class="duration guide-duration">${icon('play')}${g.duration}</span></div><div class="guide-body"><h3>${g.title}</h3><p>${g.desc}</p><span class="guide-open">Watch guide ${icon('arrow')}</span></div></button>`}

function contentView(){
 const results=filteredMedia(); const searching=!!state.search;
 return shell(`<div class="page content-page">
 <header class="page-head"><div class="page-title"><div class="eyebrow">My Content</div><h1>${searching?`Results for “${e(state.search)}”`:'Your content library'}</h1><p>${searching?`${results.length} matching assets`:'Browse, filter and download every final asset in one place.'}</p></div></header>
 <section class="library-toolbar card"><form id="content-search-form" class="content-search">${icon('search')}<input id="content-search-input" value="${e(state.search)}" placeholder="Search by title, collection or channel…"><button type="submit" class="search-submit">Search</button></form><div class="toolbar-row"><div class="filter-group"><span class="filter-label">Type</span>${['All','Video','Photography','Design'].map(x=>`<button class="pill ${state.contentType===x?'active':''}" data-type="${x}">${x}</button>`).join('')}</div><div class="filter-group"><span class="filter-label">Use</span>${['All','Instagram','Website','Ads'].map(x=>`<button class="pill ${state.channel===x?'active':''}" data-channel="${x}">${x}</button>`).join('')}</div><div class="toolbar-spacer"></div><select class="sort-select" data-sort><option ${state.sort==='Newest'?'selected':''}>Newest</option><option ${state.sort==='A–Z'?'selected':''}>A–Z</option></select><div class="view-toggle"><button class="${state.view==='grid'?'active':''}" data-view="grid">${icon('grid')}</button><button class="${state.view==='list'?'active':''}" data-view="list">${icon('list')}</button></div></div></section>
 ${state.tipVisible?`<section class="inline-tip card"><div class="inline-tip-icon">${icon('light')}</div><div><div class="eyebrow">Quick tip</div><h3>Use filters to find the right content in seconds.</h3><p>Combine content type, channel and search. Your original files stay untouched.</p></div><div class="inline-tip-gif">${tutorialImage('filters','Using filters')}</div><button class="tip-close" data-dismiss-tip>${icon('close')}</button></section>`:''}
 ${state.selected.size?bulkBar():''}
 <div class="results-head"><span><b>${results.length}</b> ${results.length===1?'asset':'assets'}</span>${searching||state.contentType!=='All'||state.channel!=='All'?'<button class="text-btn purple" data-clear-search>Clear filters</button>':''}</div>
 <div class="${state.view==='grid'?'media-grid library-grid':'media-list'}">${results.length?results.map(m=>state.view==='grid'?mediaCard(m,true):mediaListRow(m)).join(''):emptyState()}</div>
 ${results.length?flowTip('Need copy, publishing or campaign support? Flow can help with the next step.','Ask Flow','talk'):''}
 </div>`,'content')
}
function filteredMedia(){let r=[...media]; const q=state.search.toLowerCase().trim(); if(q)r=r.filter(m=>[m.title,m.collection,m.channel,m.type].join(' ').toLowerCase().includes(q)); if(state.contentType!=='All')r=r.filter(m=>m.type===state.contentType); if(state.channel!=='All')r=r.filter(m=>m.channel===state.channel); if(state.sort==='A–Z')r.sort((a,b)=>a.title.localeCompare(b.title)); return r}
function mediaListRow(m){const selected=state.selected.has(m.id);return `<article class="media-row ${selected?'selected':''}" data-asset="${m.id}"><button class="select-box list-select ${selected?'on':''}" data-select="${m.id}">${selected?icon('check'):''}</button><img src="${m.src}" style="object-position:${m.position}"><div class="row-copy"><b>${m.title}</b><small>${m.collection}</small></div><span class="tag ${tagClass(m.channel)}">${m.channel}</span><span class="row-meta">${m.file} · ${m.size}</span><button class="kebab">•••</button></article>`}
function bulkBar(){return `<div class="bulk-bar"><span><b>${state.selected.size}</b> selected</span><button class="btn soft" data-bulk-download>${icon('download')} Download</button><button class="btn ghost" data-clear-selection>Clear</button></div>`}
function emptyState(){return `<div class="empty-state card"><div class="empty-icon">${icon('search')}</div><h3>No content found.</h3><p>Try a different search or clear the current filters.</p><button class="btn soft" data-clear-search>Clear filters</button></div>`}

function collectionsView(){return shell(`<div class="page collections-page"><header class="page-head"><div class="page-title"><div class="eyebrow">Collections</div><h1>Content, grouped around moments.</h1><p>Campaigns, Content Days and brand libraries — without digging through folders.</p></div></header><div class="collections-toolbar"><div class="content-search compact">${icon('search')}<input placeholder="Search collections…"></div><select class="sort-select"><option>Newest first</option><option>Oldest first</option></select></div><div class="collections-grid">${collections.map(collectionTile).join('')}</div>${flowTip('Planning another campaign or season? We can build the next collection with you.','Talk to Flow','talk')}</div>`,'collections')}
function collectionTile(c){const ms=c.cover.map(getMedia);return `<button class="collection-tile card" data-nav="/collection/${c.slug}"><div class="collection-cover"><img src="${ms[0].src}" style="object-position:${ms[0].position}"><div class="split"><img src="${ms[1].src}" style="object-position:${ms[1].position}"><img src="${ms[2].src}" style="object-position:${ms[2].position}"></div><span class="asset-total">${c.count}</span></div><div class="collection-body"><div><h3>${c.title}</h3><p>${c.description}</p></div><span class="collection-meta">${c.count} assets <b>·</b> ${c.date}</span></div></button>`}

function collectionView(slug){const c=getCollection(slug); const items=(c.ids||[]).map(getMedia); const hero=(c.cover||[]).map(getMedia);return shell(`<div class="page collection-detail-page"><div class="breadcrumb"><button data-nav="/collections">Collections</button><span>›</span><b>${c.title}</b></div><div class="collection-hero-strip">${[...hero,hero[0],hero[1]].map((m,i)=>`<img src="${m.src}" style="object-position:${m.position}" alt="">`).join('')}</div><div class="collection-heading"><div><div class="eyebrow">Collection</div><h1>${c.title}</h1><p>${c.count} assets <span>·</span> Updated ${c.date}</p><p class="collection-desc">${c.description}</p></div><div class="collection-actions"><button class="btn ghost" data-share>${icon('share')} Share collection</button><a class="btn primary" href="downloads/Summer_Content_Day_Sample.zip" download>${icon('download')} Download collection</a></div></div><section class="usage-map card"><div class="usage-map-head"><div><div class="eyebrow">Mini content map</div><h2>How we imagined this content being used</h2></div><button class="link" data-guide="use-content">How this works ${icon('arrow')}</button></div><div class="usage-flow">${usageCard(items[0],'Reel','Instagram','Open with energy and movement.')}${usageArrow()}${usageCard(items[2]||items[0],'Photo','Website','Use as campaign or page hero imagery.')}${usageArrow()}${usageCard(items[1]||items[0],'Photo','LinkedIn','Support brand story and behind-the-scenes posts.')}</div></section><section class="section"><div class="section-head"><div><span class="section-kicker">All assets</span><h2>${c.title}</h2></div><div class="inline-controls"><button class="pill active">All types</button><button class="pill">Newest first</button></div></div><div class="media-grid collection-assets">${items.concat(media.filter(m=>!items.includes(m)).slice(0,Math.max(0,8-items.length))).map(m=>mediaCard(m)).join('')}</div></section>${flowTip('Turn these assets into a social plan. Flow can help with copy, scheduling and publishing.','Explore social support','talk')}</div>`,'collections')}
function usageCard(m,type,channel,copy){return `<div class="usage-card"><img src="${m.src}" style="object-position:${m.position}"><div><span>${type} → <b>${channel}</b></span><p>${copy}</p></div></div>`}
function usageArrow(){return `<span class="usage-arrow">→</span>`}

function assetView(id){const m=getMedia(id); const related=media.filter(x=>x.id!==m.id).slice(0,4); return shell(`<div class="page asset-page"><div class="asset-nav"><button class="text-btn" data-nav="/content">← Back to content</button><div><button class="text-btn" data-asset="${related[0].id}">← Previous</button><button class="text-btn" data-asset="${related[1].id}">Next →</button></div></div><div class="asset-layout"><section class="asset-preview card ${m.type==='Video'?'video':''}"><img src="${m.src}" style="object-position:${m.position}" alt="${e(m.title)}">${m.type==='Video'?`<button class="big-play" data-toast="Video preview — prototype">${icon('play')}</button><div class="fake-player"><button>${icon('play')}</button><span>00:00 / ${m.duration}</span><div class="player-line"><i></i></div><span>◖))</span><span>⛶</span></div>`:''}</section><aside class="asset-info"><div class="eyebrow">${m.type}</div><h1>${m.title}</h1><p class="asset-sub">${m.file} <span>·</span> ${m.duration||'Final'} <span>·</span> ${m.orientation}</p><div class="asset-block"><h3>Recommended for</h3><div class="recommend-pills"><span>${m.channel}</span><span>${m.channel==='Instagram'?'TikTok':'Instagram'}</span><span>${m.channel==='Ads'?'Meta Ads':'Campaigns'}</span></div></div><div class="asset-block"><h3>Suggested use</h3><p>${m.description}</p></div><a class="btn primary wide" href="${m.src}" download="${m.id}.jpg">${icon('download')} Download</a><button class="btn soft wide" data-talk>${icon('chat')} Need another format? Ask Flow</button></aside></div><div class="asset-bottom"><section class="details-card card"><div class="eyebrow">Asset details</div><h3>Technical information</h3>${detailRow('Version','Final')}${detailRow('Format',m.orientation==='Vertical'?'1080 × 1920 (9:16)':m.orientation==='Square'?'1080 × 1080 (1:1)':'1920 × 1080 (16:9)')}${detailRow('File size',m.size)}${detailRow('Collection',m.collection)}<div class="asset-tags"><span class="tag">Summer</span><span class="tag blue">Lifestyle</span><span class="tag green">Final</span></div></section><section class="asset-guide card"><div class="asset-guide-copy"><div class="eyebrow">Flow Tip</div><h3>${m.type==='Video'?'The first seconds matter most. Lead with your strongest visual.':'Use the recommended crop before resizing the original asset.'}</h3><button class="link" data-guide="${m.type==='Video'?'reels':'photos'}">Watch quick tutorial ${icon('arrow')}</button></div><div class="asset-guide-gif">${tutorialImage(m.type==='Video'?'reels':'photos','Quick content tutorial')}</div></section></div><section class="section"><div class="section-head"><h2>More from this collection</h2><button class="link" data-nav="/collections">View collections ${icon('arrow')}</button></div><div class="media-grid">${related.map(mediaCard).join('')}</div></section></div>`,'content')}
function detailRow(k,v){return `<div class="detail-row"><span>${k}</span><b>${v}</b></div>`}

function guidesView(){return shell(`<div class="page guides-page"><header class="page-head"><div class="page-title"><div class="eyebrow">Guides</div><h1>Tips & Guides</h1><p>Short, visual help for using the Hub and getting more from your content.</p></div></header><div class="guide-grid guides-full">${guides.filter(g=>g.id!=='use-content').map(guideCard).join('')}</div>${flowTip('Need help beyond the guides? We can support the content, campaign or website around these assets.','Talk to Flow','talk')}</div>`,'guides')}

function settingsView(){return shell(`<div class="page settings-page"><header class="page-head"><div class="page-title"><div class="eyebrow">Account</div><h1>Profile & preferences</h1><p>Manage your client account and demo settings.</p></div></header><div class="settings-grid"><section class="card settings-card"><h3>Profile</h3><div class="field"><label>Name</label><input value="Ricardo Fernandes"></div><div class="field"><label>Email</label><input value="ricardo@demo.flow"></div><div class="field"><label>Company</label><input value="Flow Demo Client"></div><button class="btn primary" data-toast="Profile saved">Save changes</button></section><section class="card settings-card"><h3>Notifications</h3>${toggleRow('New content published',true)}${toggleRow('Collection ready',true)}${toggleRow('Flow tips',false)}<hr><h3>Demo controls</h3><button class="btn ghost wide" data-reset-onboarding>Replay onboarding</button><button class="btn ghost wide" data-nav="/admin">Open Flow Admin demo</button><button class="btn danger wide" data-logout>Log out</button></section></div></div>`,'home')}
function toggleRow(label,on){return `<div class="toggle-row"><span>${label}</span><button class="toggle ${on?'on':''}" data-toggle><i></i></button></div>`}

function adminView(){return shell(`<div class="page admin-page"><header class="page-head"><div class="page-title"><div class="eyebrow">Flow Admin · Demo</div><h1>Content operations</h1><p>Publish client content without touching the front-end code.</p></div><button class="btn primary" data-toast="Upload flow opened">${icon('upload')} Upload assets</button></header><div class="admin-stats">${statCard('Active clients','12','+2 this month')}${statCard('Published assets','486','74 this month')}${statCard('Open requests','4','Talk to Flow')}${statCard('Draft collections','3','Awaiting publish')}</div><div class="admin-layout"><section class="card admin-panel"><div class="panel-head"><div><div class="eyebrow">Recent projects</div><h2>Client collections</h2></div><button class="link">View all</button></div>${collections.slice(0,4).map(c=>`<div class="admin-row"><div class="admin-thumb"><img src="${getMedia(c.cover[0]).src}"></div><div><b>${c.title}</b><small>Demo Client · ${c.count} assets</small></div><span class="status published">Published</span><button class="kebab">•••</button></div>`).join('')}</section><section class="card admin-panel"><div class="panel-head"><div><div class="eyebrow">Service requests</div><h2>Talk to Flow</h2></div></div>${['Website refresh','Paid Media adaptation','New Content Day'].map((x,i)=>`<div class="request-row"><span class="request-avatar">${['RF','AP','LM'][i]}</span><div><b>${x}</b><small>${['Ricardo · 14 min ago','Ana · 2h ago','Luis · Yesterday'][i]}</small></div><span class="status ${i?'new':'open'}">${i?'New':'Open'}</span></div>`).join('')}</section></div></div>`,'home')}
function statCard(label,value,sub){return `<div class="stat-card card"><span>${label}</span><b>${value}</b><small>${sub}</small></div>`}

function talkDrawer(){const services=[['Social Media','Copy, calendars, publishing and ongoing management.','folder'],['Video','Editing, reels, campaign adaptations and motion.','play'],['Photography','Lifestyle, product, spaces and events.','layers'],['Design & Branding','Campaign assets, templates and brand systems.','grid'],['Website','Design, development, content and optimisation.','home'],['Paid Media','Campaign strategy, creative and activation.','bell'],['Something else','Tell us what you have in mind.','chat']];return `<div class="backdrop" data-close-drawer></div><aside class="drawer"><div class="drawer-head"><div><div class="eyebrow">Made by Flow</div><h2>Talk to Flow</h2><p>Need something beyond your content library? Tell us what you’re working on and we’ll point you to the right next step.</p></div><button class="close" data-close-drawer>${icon('close')}</button></div><div class="service-list">${services.map(([n,d,i])=>`<button class="service-option ${state.selectedService===n?'selected':''}" data-service="${n}"><span class="service-icon">${icon(i)}</span><span><strong>${n}</strong><small>${d}</small></span><span>→</span></button>`).join('')}</div><div class="field"><label>Tell us what you need</label><textarea id="service-message" placeholder="E.g. We’d like to turn this collection into a paid campaign…"></textarea></div><button class="btn primary wide" data-send-flow>Send to Flow ${icon('arrow')}</button><div class="drawer-note">No commitment. We’ll come back to you with the best next step.</div></aside>`}

function notificationPopover(){return `<div class="popover notification-pop"><div class="popover-head"><h3>Notifications</h3><button class="text-btn">Mark all read</button></div>${notification('New files added','6 new assets were added to Summer Content Day.','12 min',true)}${notification('Collection ready','Summer Content Day is ready to download.','Yesterday',true)}${notification('Flow Tip','Your latest videos can also work for paid media.','2 days',false)}</div>`}
function notification(title,copy,time,unread){return `<div class="notification"><span class="dot ${unread?'on':''}"></span><div><p><b>${title}</b>${copy}</p><small>${time}</small></div></div>`}

function guideModal(id){const g=guides.find(x=>x.id===id)||guides[0];return `<div class="modal-backdrop" data-close-guide></div><section class="guide-modal card"><button class="modal-close" data-close-guide>${icon('close')}</button><div class="guide-modal-media">${tutorialImage(g.id,g.title)}</div><div class="guide-modal-copy"><div class="eyebrow">Quick guide · ${g.duration}</div><h2>${g.title}</h2><p>${g.desc}</p><ol>${g.steps.map(s=>`<li>${s}</li>`).join('')}</ol><button class="btn soft" data-close-guide>Got it</button></div></section>`}

function render(){
 const r=route();
 if(r!='/login'&&!isAuthed()){location.hash='/login';return}
 if(r==='/login') app.innerHTML=loginView();
 else if(r==='/onboarding') app.innerHTML=onboardingView();
 else if(r==='/home') app.innerHTML=homeView();
 else if(r==='/content') app.innerHTML=contentView();
 else if(r==='/collections') app.innerHTML=collectionsView();
 else if(r.startsWith('/collection/')) app.innerHTML=collectionView(r.split('/').pop());
 else if(r.startsWith('/asset/')) app.innerHTML=assetView(r.split('/').pop());
 else if(r==='/guides') app.innerHTML=guidesView();
 else if(r==='/settings') app.innerHTML=settingsView();
 else if(r==='/admin') app.innerHTML=adminView();
 else {location.hash='/home';return}
 bind();
}

function bind(){
 document.querySelectorAll('[data-nav]').forEach(el=>el.addEventListener('click',ev=>{ev.stopPropagation();state.mobileNav=false;navTo(el.dataset.nav)}));
 document.querySelectorAll('[data-asset]').forEach(el=>el.addEventListener('click',ev=>{if(ev.target.closest('[data-select],.kebab'))return;navTo('/asset/'+el.dataset.asset)}));
 document.querySelectorAll('[data-talk]').forEach(el=>el.addEventListener('click',()=>{state.drawer=true;state.notifications=false;render()}));
 document.querySelectorAll('[data-close-drawer]').forEach(el=>el.addEventListener('click',()=>{state.drawer=false;render()}));
 document.querySelectorAll('[data-service]').forEach(el=>el.addEventListener('click',()=>{state.selectedService=el.dataset.service;render()}));
 document.querySelector('[data-send-flow]')?.addEventListener('click',()=>{state.drawer=false;toast('Message sent to Flow','success');render()});
 document.querySelector('[data-notifications]')?.addEventListener('click',()=>{state.notifications=!state.notifications;render()});
 document.querySelector('[data-profile]')?.addEventListener('click',()=>navTo('/settings'));
 document.querySelectorAll('[data-mobile-menu]').forEach(el=>el.addEventListener('click',()=>{state.mobileNav=!state.mobileNav;render()}));
 document.querySelector('#login-form')?.addEventListener('submit',ev=>{ev.preventDefault();localStorage.setItem('flow-demo-auth','1');navTo(localStorage.getItem('flow-onboarding-done')?'/home':'/onboarding')});
 document.querySelectorAll('[data-finish-onboarding]').forEach(el=>el.addEventListener('click',()=>{localStorage.setItem('flow-onboarding-done','1');navTo('/home')}));
 document.querySelector('#global-search-form')?.addEventListener('submit',ev=>{ev.preventDefault();state.search=document.querySelector('#global-search-input').value.trim();state.contentType='All';state.channel='All';navTo('/content')});
 document.querySelector('#content-search-form')?.addEventListener('submit',ev=>{ev.preventDefault();state.search=document.querySelector('#content-search-input').value.trim();render()});
 document.querySelectorAll('[data-type]').forEach(el=>el.addEventListener('click',()=>{state.contentType=el.dataset.type;state.selected.clear();render()}));
 document.querySelectorAll('[data-channel]').forEach(el=>el.addEventListener('click',()=>{state.channel=el.dataset.channel;state.selected.clear();render()}));
 document.querySelector('[data-sort]')?.addEventListener('change',el=>{state.sort=el.target.value;render()});
 document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>{state.view=el.dataset.view;render()}));
 document.querySelectorAll('[data-select]').forEach(el=>el.addEventListener('click',ev=>{ev.stopPropagation();const id=el.dataset.select;state.selected.has(id)?state.selected.delete(id):state.selected.add(id);render()}));
 document.querySelector('[data-clear-selection]')?.addEventListener('click',()=>{state.selected.clear();render()});
 document.querySelector('[data-bulk-download]')?.addEventListener('click',()=>toast(`${state.selected.size} files prepared for download`,'success'));
 document.querySelectorAll('[data-clear-search]').forEach(el=>el.addEventListener('click',()=>{state.search='';state.contentType='All';state.channel='All';state.selected.clear();render()}));
 document.querySelector('[data-dismiss-tip]')?.addEventListener('click',()=>{state.tipVisible=false;localStorage.setItem('flow-tip-content','dismissed');render()});
 document.querySelectorAll('[data-guide]').forEach(el=>el.addEventListener('click',ev=>{ev.stopPropagation();state.guide=el.dataset.guide;render()}));
 document.querySelectorAll('[data-close-guide]').forEach(el=>el.addEventListener('click',()=>{state.guide=null;render()}));
 document.querySelector('[data-share]')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('Collection link copied','success')}catch{toast('Share link ready','success')}});
 document.querySelectorAll('[data-toast]').forEach(el=>el.addEventListener('click',()=>toast(el.dataset.toast||'Done','success')));
 document.querySelector('[data-reset-onboarding]')?.addEventListener('click',()=>{localStorage.removeItem('flow-onboarding-done');navTo('/onboarding')});
 document.querySelector('[data-logout]')?.addEventListener('click',()=>{localStorage.removeItem('flow-demo-auth');state.drawer=false;state.notifications=false;navTo('/login')});
 document.querySelectorAll('[data-toggle]').forEach(el=>el.addEventListener('click',()=>el.classList.toggle('on')));
}

function toast(msg,type=''){const root=document.querySelector('#toast-root');const el=document.createElement('div');el.className='toast '+type;el.innerHTML=`<span>${type==='success'?'✓':'•'}</span>${e(msg)}`;root.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),220)},2400)}
window.addEventListener('hashchange',render);
render();
