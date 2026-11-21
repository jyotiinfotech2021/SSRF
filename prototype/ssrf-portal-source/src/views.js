/* ================= Shell ================= */
function view(){let h=location.hash.slice(1).split("/")[0];h=ALIAS[h]||h;return VIEWS.includes(h)?h:"home"}
function groupOf(v){const g=GROUPS.find(g=>g[2].includes(v));return g?g[0]:null}
function renderNav(v){
  const g=groupOf(v);
  $("#groups").innerHTML=GROUPS.map(([id,label,views])=>`<a href="#${views[0]}"${id===g?' aria-current="page"':""}>${esc(label)}</a>`).join("");
  const grp=GROUPS.find(x=>x[0]===g);
  $("#subnav").innerHTML=grp&&grp[2].length>1?grp[2].map(x=>`<a href="#${x}"${x===v?' aria-current="page"':""}>${esc(x==="account"&&me()?"My account":LABEL[x])}</a>`).join(""):"";
  $("#subnavWrap").hidden=!(grp&&grp[2].length>1);
  $("#meTab").textContent=me()?"My account":"Join";
  $("#reviewTab").hidden=!S.isAdmin;
  const pend=allSubs().filter(x=>["submitted","screening","research","factcheck","approval"].includes(x.status)).length;
  $("#reviewTab").textContent=pend?`Review (${pend})`:"Review";
  if(document.activeElement!==$("#hq"))$("#hq").value=S.f.q;
}
const VIEWFN={};
const SSRF_MARK=`<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width=".6"/><path d="M20 8.5l1.6 4.9h5.1l-4.1 3 1.6 4.9-4.2-3-4.2 3 1.6-4.9-4.1-3h5.1z" fill="currentColor"/><text x="20" y="31" text-anchor="middle" font-size="6.2" font-family="Georgia,serif" letter-spacing=".6" fill="currentColor">SSRF</text></svg>`;
function renderFooter(){
  const ft=document.getElementById("siteFooter");if(!ft)return;
  const st=S.site.settings||{},yr=new Date().getFullYear();
  const social=String(st.social||"").split("\n").map(l=>l.split("|").map(x=>x.trim())).filter(x=>x[0]&&/^https?:\/\//.test(x[1]||""));
  const col=(h,links)=>`<nav class="ft-col" aria-label="${h}"><h2>${h}</h2><ul>${links.filter(Boolean).map(([t,href,ext])=>`<li><a href="${esc(href)}"${ext?' target="_blank" rel="noopener"':""}>${esc(t)}</a></li>`).join("")}</ul></nav>`;
  ft.innerHTML=`<div class="wrap ft-wrap">
   <div class="ft-brand"><div class="ft-id">${SSRF_MARK}<div><p class="ft-name">Sagat Singh Research Foundation</p><p class="ft-motto">Preserving history. Researching the evidence. Honouring the legacy.</p></div></div>
   <p class="ft-about">The foundation researches and preserves the record of Lt Gen Sagat Singh's life and campaigns. Every entry on this site cites its sources.</p></div>
   <div class="ft-cols">
    ${col("Explore",[["Biography","#life"],["Campaigns","#campaigns"],["Archive","#archive"],["Library","#library"]])}
    ${col("Participate",[["Contribute","#account"],["Stories","#stories"],["Membership","#members"],["Events","#events"]])}
    ${col("Foundation",[["About","#about"],["Research standards","#about/standards"],["Governance","#about/governance"]])}
    ${col("Connect",[["Contact",st.email?"mailto:"+st.email:"#about/governance"],["Corrections","#about/corrections"],...(social.length?social.map(([n,u])=>[n,u,1]):[["Social media","#about/governance"]])])}
   </div>
   <div class="ft-base"><p>A historical research and preservation initiative.</p><p>© ${yr} Sagat Singh Research Foundation${st.registration?`. ${esc(st.registration)}`:""}${st.address?`. ${esc(st.address)}`:""}</p></div>
  </div>`;
}
function render(){
  const v=view();need(v);renderNav(v);
  document.title=v==="home"?"Sagat Singh Research Foundation (SSRF)":`${LABEL[v]} · SSRF`;
  try{$("#main").innerHTML=VIEWFN[v]()}catch(e){console.error(e);$("#main").innerHTML=`<p class="empty">This page couldn't be shown. Reload to try again.</p>`}
  renderQuiz();renderFooter();
}
let rq=false;
function scheduleRender(){if(rq)return;rq=true;requestAnimationFrame(()=>{rq=false;const a=document.activeElement;if(a&&a.closest&&a.closest("form"))return;render()})}
document.addEventListener("focusout",()=>setTimeout(()=>{if(!document.activeElement?.closest?.("form"))scheduleRender()},0));
window.addEventListener("hashchange",()=>{S.correcting=null;S.form=null;S.edit=null;if(view()!=="archive")S.item=null;render();window.scrollTo(0,0);$("#main").focus({preventScroll:true});const sub=location.hash.slice(1).split("/")[1];const el=sub&&document.getElementById("sec-"+sub);if(el)el.scrollIntoView({block:"start"})});

/* ================= Home ================= */
VIEWFN.home=()=>{
  const life=S.claims.filter(c=>c.scope==="life").sort((a,b)=>a.order-b.order);
  const t=todayISO(),up=S.events.filter(e=>e.date>=t).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
  const recentArch=S.archive.filter(a=>a.status!=="rejected").sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,3);
  const recentStories=S.stories.slice(0,2);
  const linked=id=>[S.stories,S.books,S.places,S.events,S.archive].reduce((n,arr)=>n+arr.filter(x=>(x.camps||[]).includes(id)).length,0);
  const pt=S.site.portrait&&S.site.portrait.url?S.site.portrait:null;
  const feats=S.places.filter(x=>x.featured&&(x.images||[]).length).sort((a,b)=>(a.featureOrder||9)-(b.featureOrder||9));
  const photos=S.archive.filter(a=>a.category==="Photograph"&&a.access!=="Restricted"&&a.status!=="rejected"&&(a.files||[]).some(f=>/^image\//.test(f.type||""))).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,4);
  return `<section class="hero has-portrait hero-band hero-cine"><div class="hero-inner"><div class="hero-text">
    <div class="hero-mark">${SSRF_MARK}<span>Sagat Singh Research Foundation</span></div>
    <p class="hk-rank">Lieutenant General</p>
    <h1>Sagat Singh</h1>
    <p class="hk-hon">PVSM, Padma Bhushan</p>
    <p class="hk-years">1919–2001</p>
    <hr class="hk-rule">
    <p class="lede">He led the paratroopers into Goa, held Nathu La against the Chinese and took his corps across the Meghna to Dhaka.</p>
    <p class="mission">The Sagat Singh Research Foundation preserves the evidence of his career, researches his campaigns and makes that history usable by schools, researchers and the public. Every claim on this site says what supports it.</p>
    <div class="entry"><a class="btn" href="#campaigns">Explore his history</a><a class="btn ghost" href="#archive">Research the archive</a><a class="btn ghost" href="#account">Contribute</a></div></div>
    ${pt?`<figure class="portrait"><img src="${esc(pt.url)}" alt="${esc(pt.caption||"Lt Gen Sagat Singh")}"><figcaption>${esc(pt.caption||"")}${pt.credit?`<span>${esc(pt.credit)}${pt.archiveId?`. <a href="#archive" data-act="openItem" data-id="${esc(pt.archiveId)}">${esc(pt.archiveId)}</a>`:""}</span>`:""}</figcaption></figure>`:`<figure class="emblem">${emblem()}</figure>`}
  </div></section>
  ${S.isAdmin&&!S.offline?(S.form==="portrait"?portraitForm(pt):`<p><button class="btn small ghost" data-act="form" data-id="portrait">${pt?"Change the portrait":"Add a portrait of him"}</button>${pt?` <button class="link" data-act="removePortrait">Remove the portrait</button>`:""}</p>`):""}
  <div class="ops" aria-label="His life at a glance">${(life.length?life:SNAP.claims.filter(c=>c.scope==="life")).map(c=>`<a href="#life"><b>${esc(c.year)}</b><span>${esc(c.heading)}</span></a>`).join("")}</div>
  ${S.offline?accessNotice():""}
  ${photos.length?`<h2 class="sect">Photographs</h2><div class="photo-strip">${photos.map(a=>{const f=a.files.find(x=>/^image\//.test(x.type||""));return `<a href="#archive" data-act="openItem" data-id="${esc(a.id)}"><img src="${esc(f.url||"/_blob/"+f.assetId)}" alt="${esc(a.title)}" loading="lazy"><span>${esc(a.title)}${a.approxDate?`, ${esc(a.approxDate)}`:""}</span><em>${esc(a.creator&&a.creator!=="Unknown"?a.creator:a.donor||a.id)}</em></a>`}).join("")}</div>`:""}
  ${feats.length?`<h2 class="sect">Proposed in Bikaner</h2>${feats.map(feat=>`<section class="feature-museum"><h3>${esc(feat.name.split(" / ")[0].replace(/ \(proposed\)$/,""))}</h3><p>${esc(feat.homeBlurb||feat.description||"")} <a href="#recognition">See the full details</a>${feat.archiveId?` or <a href="#archive" data-act="openItem" data-id="${esc(feat.archiveId)}">open the full document</a>`:""}.</p>${conceptGallery(feat,4)}</section>`).join("")}`:""}
  <h2 class="sect">Campaigns</h2>
  <div class="cards">${S.camps.map(c=>`<a class="card" href="#campaigns" data-act="camp" data-id="${esc(c.id)}"><b>${esc(c.name)}</b><span>${esc(c.lead)}</span></a>`).join("")}</div>
  ${recentArch.length||recentStories.length?`<h2 class="sect">From the archive and research</h2><ul class="rel">${recentArch.map(a=>`<li><a href="#archive" data-act="openItem" data-id="${esc(a.id)}">${esc(a.title)}</a> <span class="meta">${esc(a.id)}, ${esc(a.category)}</span></li>`).join("")}${recentStories.map(s=>`<li><a href="#stories" data-act="openStory" data-id="${s.id}">${esc(s.title)}</a> ${assessTag(s.assessment)} <span class="meta">${esc(s.authorName||"A member")}</span></li>`).join("")}</ul>`:""}
  ${up.length?`<h2 class="sect">Upcoming events</h2><ul class="rel">${up.map(e=>`<li><a href="#events">${esc(e.title)}</a> <span class="meta">${esc(fmtDay(e.date))}${e.location?`, ${esc(e.location)}`:""}</span></li>`).join("")}</ul>`:""}
  <h2 class="sect">Learning</h2>
  <section class="quiz" id="quiz" aria-live="polite"></section>
  <h2 class="sect">What the foundation needs</h2>
  <ul class="prose">
    <li><b>Oral histories</b> from veterans of 1961, 1967 and 1971, and from their families. <a href="#account">Contribute an account</a>.</li>
    <li><b>Documents and photographs</b>: orders, letters, war diaries, maps and personal photographs, scanned or described. <a href="#archive">Add to the archive</a>.</li>
    <li><b>Page references</b> from <i>A Talent for War</i> for the few accounts still awaiting a second source.</li>
    <li><b>Memorials and honours</b> missing from the <a href="#recognition">recognition register</a>, Goa above all.</li>
  </ul>
  <h2 class="sect">Governing body</h2>
  <p class="prose">${esc(S.site.settings?.governance||"The governing body consists of the founder, a member of Lt Gen Sagat Singh's family, retired senior officers and others.")}</p>
  <h2 class="sect">Research and Editorial Council</h2>
  <p class="prose">${esc(S.site.settings?.council||"Retired senior officers, military historians, specialists in the 1961, 1967 and 1971 campaigns, a representative of the Sagat Singh family, an archivist and an academic editor.")}</p>`;
};

function emblem(){
  // Points placed by true longitude and latitude: x from 72E to 92E, y from 28N to 14N. No borders are drawn.
  const X=lon=>40+(lon-72)/20*320,Y=lat=>60+(28-lat)/14*250;
  const goa=[X(73.83),Y(15.49)],nat=[X(88.83),Y(27.39)],meg=[X(91.0),Y(24.03)];
  const grid=[15,20,25].map(l=>`<line x1="40" x2="360" y1="${Y(l)}" y2="${Y(l)}" class="em-grid"/><text x="40" y="${Y(l)+16}" class="em-tiny">${l}°N</text>`).join("");
  const dx=meg[0]-nat[0],dy=meg[1]-nat[1],dl=Math.hypot(dx,dy),end=[meg[0]-dx/dl*11,meg[1]-dy/dl*11];
  return `<svg viewBox="0 0 400 520" role="img" aria-label="Sagat Singh Research Foundation emblem: his campaigns at Goa in 1961, Nathu La in 1967 and the Meghna in 1971, plotted by latitude and longitude">
  <defs><marker id="em-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="em-fill"/></marker></defs>
  <rect x="8" y="8" width="384" height="504" class="em-frame"/><rect x="20" y="20" width="360" height="480" class="em-frame thin"/>
  ${grid}
  <path d="M${goa} L${nat} L${end}" class="em-route" marker-end="url(#em-arr)"/>
  <circle cx="${goa[0]}" cy="${goa[1]}" r="9" class="em-dot"/><circle cx="${nat[0]}" cy="${nat[1]}" r="9" class="em-dot"/><circle cx="${meg[0]}" cy="${meg[1]}" r="6" class="em-dot hollow"/>
  <text x="${goa[0]+16}" y="${goa[1]+6}" class="em-place">Goa</text><text x="${goa[0]+16}" y="${goa[1]+28}" class="em-year">1961</text>
  <text x="${nat[0]-24}" y="${nat[1]-16}" class="em-place" text-anchor="end">Nathu La</text><text x="${nat[0]-24}" y="${nat[1]+6}" class="em-year" text-anchor="end">1967</text>
  <text x="${meg[0]-4}" y="${meg[1]+34}" class="em-place" text-anchor="end">Meghna</text><text x="${meg[0]-4}" y="${meg[1]+56}" class="em-year" text-anchor="end">1971</text>
  <line x1="40" x2="360" y1="358" y2="358" class="em-rule"/>
  <text x="200" y="420" class="em-name" text-anchor="middle">Sagat Singh</text>
  <text x="200" y="452" class="em-dates" text-anchor="middle">1919–2001</text>
  <text x="200" y="482" class="em-tiny" text-anchor="middle">Sagat Singh Research Foundation</text>
  </svg>`;
}
function portraitForm(pt){
  pt=pt||{};
  return `<form class="panel" id="portraitForm">
    <p class="meta" style="margin-top:0">Use a photograph the foundation owns, or one the rights holder (his family, the Army, a photographer or an agency) has given permission to publish. Photos copied from websites usually belong to someone else.</p>
    <label for="pf">Photograph <small>(JPG or PNG, up to 20 MB${pt.url?"; leave empty to keep the current one":""})</small></label><input id="pf" name="file" type="file" accept="image/*"${pt.url?"":" required"}>
    <label for="pc">Caption <small>(who, when, where)</small></label><input id="pc" name="caption" maxlength="200" required value="${esc(pt.caption)}" placeholder="Lt Gen Sagat Singh, c. 1971">
    <div class="grid2">
      <div><label for="pcr">Credit <small>(photographer or source, shown with the photo)</small></label><input id="pcr" name="credit" maxlength="160" required value="${esc(pt.credit)}" placeholder="Courtesy of the Singh family"></div>
      <div><label for="prt">Rights</label><select id="prt" name="rights">${opts(RIGHTS.filter(r=>r!=="Rights unknown"),pt.rights)}</select></div>
      <div><label for="pdn">Given by</label><input id="pdn" name="donor" maxlength="160" value="${esc(pt.donor)}"></div>
      <div><label for="pdt">Approximate date</label><input id="pdt" name="approxDate" maxlength="60" value="${esc(pt.approxDate)}"></div>
    </div>
    ${pt.url?"":`<label class="check"><input type="checkbox" name="archive" checked> Also catalogue it in the archive (Sagat Singh Personal Archive)</label>`}
    <div class="actions"><button class="btn small" type="submit">${pt.url?"Save":"Add the portrait"}</button><button class="link" type="button" data-act="cancelForm">Cancel</button></div>
  </form>`;
}

/* ================= Biography ================= */
function claimBlock(c,showYear){
  const key="claims/"+c.id,open=S.open.has(key),admin=S.isAdmin&&!S.offline,rm=admin&&S.research;
  if(S.edit===key)return claimEditForm(c);
  return `<li class="claim" id="${esc(c.id)}">${showYear?`<div class="yr">${esc(c.year)}</div>`:""}
    <h3>${esc(c.heading)} ${WEAK.has(c.assessment)?assessTag(c.assessment):""}</h3>
    <p>${esc(c.text)}</p>
    <button class="link evbtn" data-act="toggle" data-id="${esc(key)}" aria-expanded="${open}">${open?"Hide sources":"Sources"}</button>
    ${open?`<div class="evpanel">
      ${citeList(c.cites)}
      ${c.unresolved&&(rm||(WEAK.has(c.assessment)&&!settled(c)))?`<h4>${rm?"Research note":"Still to confirm"}</h4><p>${esc(c.unresolved)}</p>`:""}
      ${rm?`<p class="meta">${assessTag(c.assessment)} <b>Research status:</b> ${settled(c)?"Settled":"Open"}. ${c.reviewedAt?`Last reviewed by ${esc(nameOf(c.reviewedBy))}, ${fmtDate(c.reviewedAt)}.`:""}</p>`:""}
      ${historyPanel(key)}
      <div class="actions">${correctionLink(key,(c.year?c.year+" ":"")+c.heading)}${admin?`<button class="link" data-act="edit" data-id="${esc(key)}">Edit</button>`:""}</div>
    </div>`:""}
  </li>`;
}
function claimEditForm(c){
  return `<li class="claim"><form class="panel" id="claimForm" data-id="${esc(c.id)}">
    <div class="grid2"><div><label for="ch">Heading</label><input id="ch" name="heading" value="${esc(c.heading)}" required></div>
    <div><label for="cy">Year label</label><input id="cy" name="year" value="${esc(c.year||"")}"></div></div>
    <label for="ct">Claim</label><textarea id="ct" name="text" required style="min-height:5rem">${esc(c.text)}</textarea>
    <div class="grid2"><div><label for="ca">Assessment</label><select id="ca" name="assessment">${kopts(ASSESS,c.assessment)}</select></div>
    <div><label for="cst">Research status</label><select id="cst" name="status"><option value="open"${!settled(c)?" selected":""}>Open</option><option value="settled"${settled(c)?" selected":""}>Settled</option></select></div></div>
    <label for="ce">What is established</label><textarea id="ce" name="established" style="min-height:3rem">${esc(c.established)}</textarea>
    <label for="cu">What needs resolution</label><textarea id="cu" name="unresolved" style="min-height:3rem">${esc(c.unresolved)}</textarea>
    <label for="cc">Citations <small>(one per line: source id | location, such as wiki | quoted passage, or pib | para 4. Ids are listed under Sources.)</small></label>
    <textarea id="cc" name="cites" style="min-height:5rem">${esc((c.cites||[]).map(x=>`${x.s} | ${x.loc||""}`).join("\n"))}</textarea>
    <label for="cr">Reason for the change <small>(required; kept in the public history)</small></label><input id="cr" name="reason" required maxlength="400">
    <div class="actions"><button class="btn small" type="submit">Save revision</button><button class="link" type="button" data-act="cancelEdit">Cancel</button></div>
  </form></li>`;
}
VIEWFN.life=()=>{
  const life=S.claims.filter(c=>c.scope==="life").sort((a,b)=>a.order-b.order);
  return `<h2>Biography</h2>
  <p class="sub">His life in ${life.length||"ten"} milestones. Every entry is sourced: open "Sources" under any entry to see them.</p>${S.isAdmin&&!S.offline?`<p class="meta"><button class="link" data-act="researchMode">${S.research?"Hide research notes (show the public view)":"Show research notes (editors only)"}</button></p>`:""}
  ${accessNotice()}
  ${!isReady("claims")&&!life.length?`<p class="empty">Loading…</p>`:`<ol class="timeline">${life.map(c=>claimBlock(c,true)).join("")}</ol>`}
  ${citePanel("Lt Gen Sagat Singh: biography","life")}`;
};

/* ================= Campaigns ================= */
const campEmpty=(c,f)=>{const v=c[f];return !v||(Array.isArray(v)?!v.length:/^Not yet researched/.test(v))};
function campSection(c,field,title,num,kind){
  const key=`campaigns/${c.id}#${field}`,admin=S.isAdmin&&!S.offline,rm=admin&&S.research,val=c[field];
  if(!rm&&campEmpty(c,field))return "";
  let body;
  if(S.edit===key){
    const text=kind==="text"?val:kind==="list"?(val||[]).join("\n"):kind==="chron"?(val||[]).map(r=>`${r.d} | ${r.e} | ${r.s||""}${r.m?" | milestone":""}`).join("\n"):(val||[]).map(r=>`${r.d} | ${r.c} | ${r.s||""}`).join("\n");
    const hint={text:"",list:"One item per line.",chron:"One per line: date | event | source id, and add | milestone to highlight an entry",dec:"One per line: decision | consequence | source id"}[kind];
    body=`<form class="panel" id="campForm" data-id="${esc(c.id)}" data-field="${field}" data-kind="${kind}"><label for="cf">${esc(title)} <small>${hint}</small></label><textarea id="cf" name="value" style="min-height:7rem">${esc(text)}</textarea>
    ${kind==="text"?`<label for="cfs">Sources <small>(source ids, separated by commas)</small></label><input id="cfs" name="cites" value="${esc((c[field+"Cites"]||[]).join(", "))}">`:""}
    <label for="cfr">Reason for the change</label><input id="cfr" name="reason" required maxlength="400"><div class="actions"><button class="btn small" type="submit">Save revision</button><button class="link" type="button" data-act="cancelEdit">Cancel</button></div></form>`;
  }else if(kind==="text"){
    const empty=!val||/^Not yet researched/.test(val);
    body=`<p class="${empty?"meta":""}">${esc(val||"Not yet researched.")}</p>${!empty&&((c[field+"Cites"]||[]).length||rm)?`<p class="meta">Sources: ${shortCite(c[field+"Cites"])}</p>`:""}`;
  }else if(kind==="list")body=(val||[]).length?`<ul>${val.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:`<p class="meta">Not yet researched.</p>`;
  else if(kind==="chron")body=(val||[]).length?vChron(c)+`<table class="plain chron sr-only"><thead><tr><th>Date</th><th>Event</th><th>Source</th></tr></thead><tbody>${val.map(r=>`<tr><td>${esc(r.d)}</td><td>${esc(r.e)}</td><td>${r.s?shortCite([r.s]):(S.isAdmin&&S.research?`<span class="nosrc">Not yet sourced</span>`:"")}</td></tr>`).join("")}</tbody></table>`:`<p class="meta">Not yet researched.</p>`;
  else body=(val||[]).length?`<table class="plain"><thead><tr><th>Decision</th><th>Consequence</th><th>Source</th></tr></thead><tbody>${val.map(r=>`<tr><td>${esc(r.d)}</td><td>${esc(r.c)}</td><td>${r.s?shortCite([r.s]):""}</td></tr>`).join("")}</tbody></table>`:`<p class="meta">Not yet researched.</p>`;
  return `<section class="dos" id="s-${field}"><h4>${rm?`<span class="num">${num}</span> `:""}${esc(title)}${admin&&S.edit!==key?` <button class="link quiet" data-act="edit" data-id="${esc(key)}">Edit</button>`:""}</h4>${body}${S.edit!==key?historyPanel(key):""}</section>`;
}
function commandChart(c){
  const nodes=c.command||[],roots=nodes.filter(n=>!n.parent);
  const node=n=>`<li><div class="cnode${n.his?" his":""}${n.checked||!(S.isAdmin&&S.research)?"":" unchecked"}"><b>${esc(n.name)}</b><span>${esc(n.who)}</span><em>${n.checked?shortCite([n.cite]):(S.isAdmin&&S.research?"Not yet checked":"")}</em></div>${nodes.some(k=>k.parent===n.id)?`<ul>${nodes.filter(k=>k.parent===n.id).map(node).join("")}</ul>`:""}</li>`;
  return `<ul class="ctree">${roots.map(node).join("")}</ul>${c.commandNote&&S.isAdmin&&S.research?`<p class="meta">${esc(c.commandNote)}</p>`:""}`;
}
function meghnaMap(){
  return `<figure class="map"><svg viewBox="0 0 640 380" role="img" aria-label="Explanatory sketch of the Meghna crossing, not to scale">
  <defs><marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--beret)"/></marker></defs>
  <path d="M400 0 C380 80 420 140 395 200 C370 260 410 320 390 380" fill="none" stroke="var(--river)" stroke-width="34" stroke-linecap="round" opacity=".9"/>
  <text x="430" y="40" class="mlabel">River Meghna</text>
  <line x1="372" y1="120" x2="422" y2="120" stroke="var(--ink)" stroke-width="4" stroke-dasharray="6 6"/>
  <text x="300" y="104" class="mlabel">Bhairab Bazar</text><circle cx="360" cy="120" r="5" fill="var(--ink)"/>
  <text x="440" y="124" class="mlabel">Ashuganj</text><circle cx="432" cy="120" r="5" fill="var(--ink)"/>
  <text x="396" y="160" class="msmall" text-anchor="middle">bridge out of use</text>
  <path d="M470 150 C450 210 380 230 300 228" fill="none" stroke="var(--beret)" stroke-width="2.5" stroke-dasharray="7 5" marker-end="url(#arw)"/>
  <text x="472" y="200" class="msmall">airlift by helicopter</text>
  <circle cx="292" cy="230" r="5" fill="var(--ink)"/><text x="232" y="220" class="mlabel">Raipura</text>
  <circle cx="206" cy="282" r="5" fill="var(--ink)"/><text x="130" y="276" class="mlabel">Narsingdi</text>
  <path d="M286 236 L212 278 M200 288 L96 340" fill="none" stroke="var(--beret)" stroke-width="2.5" marker-end="url(#arw)"/>
  <rect x="78" y="334" width="14" height="14" fill="var(--beret)"/><text x="40" y="370" class="mlabel">Dhaka</text>
  <text x="590" y="366" class="msmall" text-anchor="middle">N</text><path d="M590 334 L584 346 L590 342 L596 346Z" fill="var(--ink)"/>
  </svg><figcaption>Explanatory sketch by SSRF, not to scale and not a historical map. Positions are approximate, and the landing areas follow common published accounts that SSRF has yet to check. ${esc("Original operational maps are wanted.")}</figcaption></figure>`;
}
VIEWFN.campaigns=()=>{
  const list=S.camps;if(!list.length)return `<h2>Campaigns</h2>${accessNotice()}<p class="empty">Loading…</p>`;
  const c=list.find(x=>x.id===S.camp)||list[0],has=x=>(x.camps||[]).includes(c.id);
  const claims=S.claims.filter(x=>x.scope===c.id).sort((a,b)=>a.order-b.order);
  const eye=S.stories.filter(s=>has(s)&&["Oral history","Family testimony"].includes(s.nature));
  const eyeArch=S.archive.filter(a=>has(a)&&a.category==="Oral history");
  const arch=S.archive.filter(a=>has(a)&&a.category!=="Oral history");
  const prim=S.books.filter(b=>has(b)&&b.nature==="Primary source");
  const usedSrc=[...new Set([...claims.flatMap(x=>(x.cites||[]).map(y=>y.s)),...(c.chronology||[]).map(r=>r.s).filter(Boolean),...(c.command||[]).map(n=>n.cite).filter(Boolean)])];
  const ents=S.entities.filter(e=>(e.camps||[]).includes(c.id));
  const toc=[["background","Background"],["map","Map"],["objectives","Objectives"],["situation","Situation"],["findings","What the sources say"],["chronology","Chronology"],["command","Command structure"],["units","Order of battle"],["role","His role"],["decisions","Decisions"],["eyewitness","Eyewitness accounts"],["records","Official and archival sources"],["disagreements","Disagreements"],["significance","Why it mattered"],["unknowns","What we do not yet know"]].filter(([id])=>id!=="unknowns"||(S.isAdmin&&!S.offline&&S.research));
  const admin=S.isAdmin&&!S.offline&&S.research;
  const show=id=>admin||({map:!!campKey(c),findings:claims.length,command:(c.command||[]).length,eyewitness:eye.length+eyeArch.length,records:arch.length+prim.length+usedSrc.length}[id]??!campEmpty(c,id));
  return `<h2>Campaigns</h2>
  <p class="sub">The three campaigns that defined his career, each with its sources.</p>${S.isAdmin&&!S.offline?`<p class="meta"><button class="link" data-act="researchMode">${S.research?"Hide research notes (show the public view)":"Show research notes (editors only)"}</button></p>`:""}
  ${accessNotice()}
  <div class="seg-tabs" role="tablist">${list.map(x=>`<button role="tab" aria-selected="${x.id===c.id}" data-act="camp" data-id="${esc(x.id)}">${esc(x.name)}</button>`).join("")}</div>
  ${campBanner(c,list.indexOf(c),list.length)}
  ${campCallouts(c)}
  <article class="dossier camp-dossier">
    <nav class="toc" aria-label="On this page">${toc.filter(([id])=>show(id)).map(([id,l])=>`<a href="#campaigns" data-act="jump" data-id="s-${id}">${l}</a>`).join("")}</nav>
    ${campSection(c,"background","Historical and geopolitical background",1,"text")}
    ${campPhotos(c,"background")}
    ${campKey(c)?`<section class="dos" id="s-map"><h4>The campaign area</h4>${campMap(c)}</section>`:c.map==="meghna"?meghnaMap():admin?`<p class="meta map-wanted">${esc(c.mapWanted||"Maps are wanted.")}</p>`:""}
    ${campSection(c,"objectives","Strategic objectives",2,"text")}
    ${campSection(c,"situation","Operational situation",3,"text")}
    <section class="dos" id="s-findings"><h4>What the sources say</h4><ol class="claims-list">${claims.map(x=>claimBlock(x,false)).join("")}</ol></section>
    ${campSection(c,"chronology","Chronology of operations",6,"chron")}
    ${campPhotos(c,"chronology")}
    ${show("command")?`<section class="dos" id="s-command"><h4>${admin?`<span class="num">4</span> `:""}Command structure</h4>${orgChart(c)}</section>`:""}
    ${campSection(c,"units","Order of battle and units",5,"list")}
    ${ents.length?`<p class="meta">Profiles: ${ents.map(e=>`<a href="#people" data-act="jump" data-id="${esc(e.id)}">${esc(e.name)}</a>`).join(" · ")}</p>`:""}
    ${campSection(c,"role","Sagat Singh's role",7,"text")}
    ${campPhotos(c,"role")}
    ${campSection(c,"decisions","Major decisions and their consequences",8,"dec")}
    ${show("eyewitness")?`<section class="dos" id="s-eyewitness"><h4>${admin?`<span class="num">9</span> `:""}Eyewitness accounts</h4>${eye.length||eyeArch.length?`<ul class="rel">${eye.map(s=>`<li><a href="#stories" data-act="openStory" data-id="${s.id}">${esc(s.title)}</a> ${natureTag(s.nature)} ${assessTag(s.assessment)}</li>`).join("")}${eyeArch.map(a=>`<li><a href="#archive" data-act="openItem" data-id="${esc(a.id)}">${esc(a.title)}</a> <span class="meta">${esc(a.id)}</span></li>`).join("")}</ul>`:`<p class="meta">None recorded yet. First-hand and family accounts linked to this campaign will appear here. <a href="#account">Contribute one</a>.</p>`}</section>`:""}
    <section class="dos" id="s-records"><h4>${admin?`<span class="num">10</span> `:""}Sources</h4>
      ${arch.length?`<p><b>In the SSRF archive</b></p><ul class="rel">${arch.map(a=>`<li><a href="#archive" data-act="openItem" data-id="${esc(a.id)}">${esc(a.title)}</a> <span class="meta">${esc(a.id)}, ${esc(a.category)}</span></li>`).join("")}</ul>`:admin?`<p class="meta">No archival items catalogued for this campaign yet.</p>`:""}
      ${prim.length?`<p><b>Primary sources in the library</b></p><ul class="rel">${prim.map(b=>`<li>${b.link?`<a href="${esc(b.link)}" target="_blank" rel="noopener">${esc(b.title)}</a>`:esc(b.title)}</li>`).join("")}</ul>`:""}
      <p><b>Sources cited on this page</b></p><ol class="cites">${rankKeys(usedSrc).map(k=>`<li>${citeText({s:k})}</li>`).join("")}</ol></section>
    ${campSection(c,"disagreements","Historiographical disagreements",11,"list")}
    ${campSection(c,"significance","Why this campaign mattered",12,"text")}
    ${admin?campSection(c,"unknowns","What we do not yet know",13,"list"):""}
    ${admin||S.books.some(has)||S.places.some(has)||S.events.some(has)?`<section class="dos"><h4>Related in the library, register and events</h4><div class="grid-rel">
      ${admin||S.books.some(has)?`<div><b>Library and videos</b>${(()=>{const b=S.books.filter(has);return b.length?`<ul class="rel">${b.map(x=>`<li>${x.link?`<a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.title)}</a>`:esc(x.title)} <span class="meta">${esc(x.creator||"")}</span></li>`).join("")}</ul>`:(admin?`<p class="meta">None linked.</p>`:"")})()}</div>`:""}
      ${admin||S.places.some(has)?`<div><b>Recognition</b>${(()=>{const p=S.places.filter(has);return p.length?`<ul class="rel">${p.map(x=>`<li>${esc(x.name)} ${vTag(x.status)}</li>`).join("")}</ul>`:(admin?`<p class="meta">None linked.</p>`:"")})()}</div>`:""}
      ${admin||S.events.some(has)?`<div><b>Events</b>${(()=>{const e=S.events.filter(has);return e.length?`<ul class="rel">${e.map(x=>`<li>${esc(x.title)} <span class="meta">${esc(fmtDay(x.date))}</span></li>`).join("")}</ul>`:(admin?`<p class="meta">None linked.</p>`:"")})()}</div>`:""}
    </div></section>`:""}
    <div class="actions">${correctionLink("campaigns/"+c.id,c.name)}</div>
    ${citePanel(c.name,"campaigns")}
  </article>
  ${admin?`<p class="meta">Dossiers for the Bikaner years and the Second World War, the Mizo Hills, and his later life will follow the same form.</p>`:""}`;
};

/* ===== Campaign visuals: banner, callouts, map, chronology, command chart, photographs ===== */
const CMAPOV={
 goa:{km:10,inset:"bl",regions:[["ARABIAN SEA",73.66,15.12],["MAHARASHTRA",74.2,15.8],["KARNATAKA",74.32,15.05],["GOA",74.13,15.2]],
  rivers:[],
  places:[["Panjim",73.8278,15.4989,"cap",-8,-10,"end"],["Mapusa",73.809,15.591,"town",-8,4,"end"],["Bicholim",73.951,15.588,"town",8,4],["Banastarim",73.955,15.483,"town",8,4],["Ponda",74.015,15.403,"town",8,12],["Vasco da Gama",73.813,15.397,"town",-8,12,"end"],["Margao",73.958,15.273,"town",8,4],["Mollem",74.233,15.383,"town",0,16,"middle"]],
  routes:[
   {k:"adv",pts:[[73.79,15.72],[73.80,15.63],[73.809,15.591],[73.82,15.51]],label:"2 Sikh LI",lx:73.66,ly:15.66},
   {k:"adv",pts:[[74.03,15.72],[73.951,15.588],[73.955,15.49],[73.86,15.495]],label:"1 Para",lx:74.0,ly:15.66},
   {k:"adv",pts:[[74.16,15.66],[74.08,15.47],[74.03,15.415]],label:"2 Para",lx:74.17,ly:15.55},
   {k:"adv2",pts:[[74.33,15.39],[74.233,15.383],[74.03,15.40],[73.97,15.29]],label:"17 Infantry Division",lx:74.06,ly:15.32}],
  legend:[["adv","50 (Independent) Parachute Brigade, his command"],["adv2","17 Infantry Division"],["cap","Capital, reached on 19 December 1961"]],
  note:"Explanatory map by SSRF. Routes are approximate and follow the official history (Khera 1974) and published accounts of the three columns of 50 Parachute Brigade."},
 nathula:{km:10,inset:"bl",regions:[["TIBET (CHINA)",88.95,27.9],["SIKKIM",88.42,27.62],["BHUTAN",89.05,27.12],["WEST BENGAL",88.4,27.05],["Chumbi Valley",89.0,27.64]],
  rivers:[],
  places:[["Gangtok",88.6065,27.3389,"town",-8,4,"end"],["Nathu La",88.8306,27.3864,"clash",-12,16,"end"],["Cho La",88.79,27.43,"clash",-10,-6,"end"],["Jelep La",88.8667,27.3667,"out",12,18],["Yadong",88.905,27.48,"town",8,-6]],
  routes:[],
  legend:[["clash","Pass held by 17 Mountain Division in 1967"],["out","Pass vacated in 1965"]],
  note:"Explanatory map by SSRF. Pass positions are approximate. The boundary shown is India's official boundary."},
 meghna:{km:25,inset:"bl",regions:[["BANGLADESH (then East Pakistan)",90.75,24.75],["MEGHALAYA",91.3,25.22],["TRIPURA",91.62,23.6],["ASSAM",92.35,24.95]],
  rivers:[{n:"Meghna",pts:[[91.3,24.62],[91.15,24.38],[91.04,24.18],[90.985,24.05],[90.92,23.97],[90.86,23.87],[90.78,23.68],[90.72,23.52],[90.66,23.35],[90.64,23.17]],lx:90.62,ly:23.45},
          {n:"Surma",pts:[[91.87,24.9],[91.7,24.96],[91.52,24.88],[91.38,24.73],[91.3,24.62]],lx:91.55,ly:25.0}],
  places:[["Sylhet",91.87,24.9,"town",8,-6],["Bhairab Bazar",90.985,24.055,"town",-8,-6,"end"],["Ashuganj",91.0,24.03,"town",10,-8],["Brahmanbaria",91.11,23.96,"town",8,12],["Akhaura",91.2,23.87,"town",8,12],["Raipura",90.86,23.97,"town",0,-12,"middle"],["Narsingdi",90.72,23.92,"town",0,22,"middle"],["Dhaka",90.41,23.81,"cap",0,-14,"middle"],["Comilla",91.18,23.46,"town",8,4]],
  routes:[
   {k:"adv",pts:[[91.28,23.84],[91.2,23.87],[91.11,23.96],[91.02,24.02]],label:"57 Mountain Division",lx:91.38,ly:23.98},
   {k:"air",pts:[[91.08,23.99],[90.95,23.93],[90.88,23.955]],label:"Helicopter lift across the Meghna",lx:90.95,ly:23.8},
   {k:"adv",pts:[[90.84,23.95],[90.72,23.92],[90.6,23.87],[90.45,23.82]]},
   {k:"air",pts:[[92.03,24.5],[91.96,24.7],[91.89,24.87]],label:"Heliborne landing near Sylhet",lx:91.72,ly:24.64}],
  legend:[["adv","IV Corps advance"],["air","Helicopter lift"],["cap","Dhaka, surrender on 16 December 1971"]],
  note:"Explanatory map by SSRF. Rivers, routes and landing areas are approximate and follow published accounts; original operational maps are wanted. The boundary shown is India's official boundary."}
};
const campKey=c=>CMAPS[c.mapKey||c.id]?c.mapKey||c.id:null;
function mapProj(m){const [lon0,lon1,lat0,lat1]=m.bb,kx=m.W/(lon1-lon0),ky=kx/Math.cos((lat0+lat1)/2*Math.PI/180);return {kx,ky,P:(lon,lat)=>[(lon-lon0)*kx,(lat1-lat)*ky]}}
function campMap(c){
  const key=campKey(c);if(!key)return "";
  const m=CMAPS[key],ov=CMAPOV[key]||{},{kx,P}=mapProj(m),f=n=>n.toFixed(1);
  const line=pts=>pts.map((p,i)=>(i?"L":"M")+P(p[0],p[1]).map(f).join(" ")).join("");
  const mk=(t,x,y)=>t==="cap"?`<rect x="${f(x-6)}" y="${f(y-6)}" width="12" height="12" class="mp-cap"/>`:t==="clash"?`<path d="M${f(x)} ${f(y-9)}L${f(x+8)} ${f(y+6)}L${f(x-8)} ${f(y+6)}Z" class="mp-clash"/>`:t==="out"?`<path d="M${f(x)} ${f(y-8)}L${f(x+7)} ${f(y+5)}L${f(x-7)} ${f(y+5)}Z" class="mp-out"/>`:`<circle cx="${f(x)}" cy="${f(y)}" r="4" class="mp-town"/>`;
  const midLat=(m.bb[2]+m.bb[3])/2,kmPx=ov.km/(111.32*Math.cos(midLat*Math.PI/180))*kx;
  const iw=96,ih=iw*INDIA.H/INDIA.W,ix=ov.inset==="br"?m.W-iw-14:14,iy=m.H-ih-14;
  const a=inP(m.bb[3],m.bb[0]),b=inP(m.bb[2],m.bb[1]),sc=iw/INDIA.W;
  return `<figure class="cmap"><div class="cmap-scroll"><svg viewBox="0 0 ${m.W} ${m.H}" role="img" aria-label="Map of the ${esc(c.name)} campaign area">
  <defs><marker id="ar-${key}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="mp-arrowhead"/></marker>
  <marker id="ar2-${key}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="mp-arrowhead2"/></marker></defs>
  <rect width="${m.W}" height="${m.H}" class="mp-foreign"/>
  ${m.sea?`<path d="${m.sea}" class="mp-sea"/>`:""}${m.foreign?`<path d="${m.foreign}" class="mp-foreign"/>`:""}
  <path d="${m.ind}" class="mp-india"/>${m.internal?`<path d="${m.internal}" class="mp-internal"/>`:""}
  ${m.focus?`<path d="${m.focus}" class="mp-focus"/>`:""}${m.focusLine?`<path d="${m.focusLine}" class="mp-focusline"/>`:""}
  ${(ov.rivers||[]).map(r=>`<path d="${line(r.pts)}" class="mp-river"/>${r.lx?`<text x="${f(P(r.lx,r.ly)[0])}" y="${f(P(r.lx,r.ly)[1])}" class="mp-rlabel">${esc(r.n)}</text>`:""}`).join("")}
  ${(ov.regions||[]).map(([t,lo,la])=>{const [x,y]=P(lo,la);return `<text x="${f(x)}" y="${f(y)}" class="mp-region" text-anchor="middle">${esc(t)}</text>`}).join("")}
  ${(ov.routes||[]).map(r=>`<path d="${line(r.pts)}" class="mp-${r.k}" marker-end="url(#${r.k==="adv2"?"ar2":"ar"}-${key})"/>${r.label?`<text x="${f(P(r.lx,r.ly)[0])}" y="${f(P(r.lx,r.ly)[1])}" class="mp-rtlabel${r.k==="adv2"?" two":""}" text-anchor="middle">${esc(r.label)}</text>`:""}`).join("")}
  ${(ov.places||[]).map(([n,lo,la,t,dx,dy,an])=>{const [x,y]=P(lo,la);return `${mk(t,x,y)}<text x="${f(x+(dx||0))}" y="${f(y+(dy||0))}" class="mp-label${t==="cap"||t==="clash"?" strong":""}" text-anchor="${an||"start"}">${esc(n)}</text>`}).join("")}
  <g transform="translate(${m.W-kmPx-28} ${m.H-28})"><path d="M0 0H${f(kmPx)}" class="mp-scale"/><path d="M0 -4V4M${f(kmPx)} -4V4" class="mp-scale"/><text x="${f(kmPx/2)}" y="-8" text-anchor="middle" class="mp-small">${ov.km} km</text></g>
  <g transform="translate(${m.W-30} 34)"><path d="M0 -18L7 4L0 0L-7 4Z" class="mp-north"/><text y="18" text-anchor="middle" class="mp-small">N</text></g>
  <g transform="translate(${ix} ${iy})" class="mp-inset"><rect x="-6" y="-6" width="${iw+12}" height="${f(ih+12)}" class="mp-insetbg"/><path d="${INDIA.d}" transform="scale(${sc.toFixed(4)})" class="mp-insetland"/><rect x="${f(a[0]*sc-2)}" y="${f(a[1]*sc-2)}" width="${f(Math.max(4,(b[0]-a[0])*sc+4))}" height="${f(Math.max(4,(b[1]-a[1])*sc+4))}" class="mp-insetbox"/></g>
  </svg></div><p class="cmap-hint">Swipe sideways to see the whole map.</p><figcaption><ul class="mp-legend">${(ov.legend||[]).map(([k,t])=>`<li><svg viewBox="0 0 28 12" aria-hidden="true">${k==="adv"||k==="adv2"||k==="air"?`<path d="M1 6H25" class="mp-${k}"/>`:k==="cap"?`<rect x="8" y="0" width="12" height="12" class="mp-cap"/>`:`<path d="M14 0L21 12H7Z" class="mp-${k}"/>`}</svg>${esc(t)}</li>`).join("")}</ul><span>${esc(ov.note||"")}</span></figcaption></figure>`;
}
const RANKFULL={"Brig":"Brigadier","Maj Gen":"Major General","Lt Gen":"Lieutenant General","Gen":"General"};
function campBanner(c,idx,total){
  const his=(c.command||[]).find(n=>n.his),key=campKey(c),m=key&&CMAPS[key];
  const rk=his&&Object.keys(RANKFULL).sort((a,b)=>b.length-a.length).find(r=>his.who.startsWith(r+" "));
  const yr=c.year||(String(c.era||c.name).match(/(19|20)\d\d/)||[""])[0];
  const facts=[["Theatre",c.theatre],["His command",his&&his.name],["His rank",rk&&RANKFULL[rk]],["Dates",c.dates]].filter(x=>x[1]);
  return `<header class="cbanner${c.banner?" has-img":""}"${c.banner?` style="--cb-img:url('${esc(c.banner)}')"`:""}>
   ${m&&m.focus&&!c.banner?`<svg class="cb-shape" viewBox="0 0 ${m.W} ${m.H}" preserveAspectRatio="xMaxYMid meet" aria-hidden="true"><path d="${m.focus}"/></svg>`:""}
   ${yr?`<span class="cb-year" aria-hidden="true">${esc(yr)}</span>`:""}
   <div class="cb-inner"><p class="cb-eye">Campaign ${idx+1} of ${total}${c.era?` · ${esc(c.era)}`:""}</p>
   <h3 class="cb-title">${esc(c.name)}</h3><p class="cb-lead">${esc(c.lead)}</p>
   ${facts.length?`<dl class="cb-facts">${facts.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`:""}</div>
   ${c.banner&&c.bannerCredit?`<p class="cb-credit">${esc(c.bannerCredit)}</p>`:""}</header>`;
}
function campCallouts(c){
  const ms=c.milestones||[];if(!ms.length)return "";
  return `<section class="callouts" aria-label="Operational milestones">${ms.map(x=>`<div class="callout"><b>${esc(x.fig)}</b><p>${esc(x.label)}</p><span class="meta">${x.s?shortCite([x.s]):""}${x.loc?`, ${esc(x.loc)}`:""}</span></div>`).join("")}</section>`;
}
function vChron(c){
  const rows=c.chronology||[];if(!rows.length)return "";
  return `<ol class="vchron" style="--n:${rows.length}">${rows.map(r=>`<li class="${r.m?"ms":""}"><span class="vc-dot" aria-hidden="true"></span><time>${esc(r.d)}</time><p>${esc(r.e)}</p>${r.s?`<span class="vc-src">${shortCite([r.s])}</span>`:(S.isAdmin&&S.research?`<span class="nosrc">Not yet sourced</span>`:"")}</li>`).join("")}</ol>`;
}
const echelon=n=>/Headquarters$/.test(n)?"Army HQ":/Command$/.test(n)?"Command":/Corps$/.test(n)?"Corps":/Division$/.test(n)?"Division":/Brigade$/.test(n)?"Brigade":/Para|Infantry|Regiment|Rifles|Battalion|LI\b/.test(n)?"Battalion":"";
function orgChart(c){
  const nodes=c.command||[],rm=S.isAdmin&&S.research,roots=nodes.filter(n=>!n.parent);
  const box=n=>`<div class="oc-node${n.his?" his":""}${n.checked||!rm?"":" unchecked"}">${echelon(n.name)?`<span class="oc-lvl">${echelon(n.name)}</span>`:""}<b>${esc(n.name)}</b>${n.who&&n.who!=="To be confirmed"?`<span class="oc-who">${esc(n.who)}</span>`:n.who?`<span class="oc-who muted">Commander to be confirmed</span>`:""}${n.his?`<span class="oc-his">His command</span>`:""}${rm?`<em>${n.checked?shortCite([n.cite]):"Not yet checked"}</em>`:""}</div>`;
  const tree=n=>{const kids=nodes.filter(k=>k.parent===n.id);return `<li>${box(n)}${kids.length?`<ul>${kids.map(tree).join("")}</ul>`:""}</li>`};
  const srcs=[...new Set(nodes.filter(n=>n.checked&&n.cite).map(n=>n.cite))];
  return `<div class="orgchart"><ul>${roots.map(tree).join("")}</ul></div>${srcs.length&&!rm?`<p class="meta">Sources: ${shortCite(srcs)}</p>`:""}${c.commandNote&&rm?`<p class="meta">${esc(c.commandNote)}</p>`:""}`;
}
function campPhotos(c,slot){
  const has=x=>(x.camps||[]).includes(c.id);
  const arch=S.archive.filter(a=>has(a)&&a.access!=="Restricted"&&a.status!=="rejected"&&(a.files||[]).some(f=>/^image\//.test(f.type||""))).map(a=>{const f=a.files.find(x=>/^image\//.test(x.type||""));return {url:f.url||"/_blob/"+f.assetId,caption:a.title+(a.approxDate?`, ${a.approxDate}`:""),credit:a.creator&&a.creator!=="Unknown"?a.creator:(a.donor||a.id),id:a.id,slot:a.campSlot||"background"}});
  const ph=[...(c.photos||[]).map(p=>({...p,slot:p.slot||"background"})),...arch].filter(p=>p.slot===slot);
  if(!ph.length)return slot==="background"&&S.isAdmin&&S.research?`<p class="meta map-wanted">Historical photographs for this campaign are wanted. Add them to the archive with this campaign selected and they will appear here.</p>`:"";
  return `<div class="cphotos n${Math.min(ph.length,3)}">${ph.slice(0,3).map(p=>`<figure><img src="${esc(p.url)}" alt="${esc(p.caption||"")}" loading="lazy"><figcaption>${esc(p.caption||"")}${p.credit?`<span>${esc(p.credit)}${p.id?`. <a href="#archive" data-act="openItem" data-id="${esc(p.id)}">${esc(p.id)}</a>`:""}</span>`:""}</figcaption></figure>`).join("")}</div>`;
}

/* ================= People and units ================= */
VIEWFN.people=()=>{
  const card=e=>{const key="entities/"+e.id;return `<article class="story" id="${esc(e.id)}"><div>${editorialTag}${e.period?`<span class="tag">${esc(e.period)}</span>`:""}</div><h3>${esc(e.name)}</h3>
    ${S.edit===key?`<form class="panel inline" id="entityForm" data-id="${esc(e.id)}"><label for="er">Role in his story</label><textarea id="er" name="role" required style="min-height:4rem">${esc(e.role)}</textarea><label for="es">Sources <small>(ids, separated by commas)</small></label><input id="es" name="cites" value="${esc((e.cites||[]).join(", "))}"><label for="err">Reason for the change</label><input id="err" name="reason" required><div class="actions"><button class="btn small" type="submit">Save revision</button><button class="link" type="button" data-act="cancelEdit">Cancel</button></div></form>`:`<p>${esc(e.role)}</p>`}
    <p class="meta">${(e.camps||[]).length?`Campaigns: ${(e.camps||[]).map(campName).map(esc).join(", ")}. `:""}Sources: ${shortCite(e.cites)}</p>
    ${historyPanel(key)}<div class="actions">${correctionLink(key,e.name)}${S.isAdmin&&S.edit!==key?`<button class="link" data-act="edit" data-id="${esc(key)}">Edit</button>`:""}</div></article>`};
  const units=S.entities.filter(e=>e.type==="unit").sort((a,b)=>String(a.period).localeCompare(String(b.period))),people=S.entities.filter(e=>e.type==="person");
  return `<h2>People and units</h2>
  <p class="sub">The formations he served in and commanded, and the people whose decisions crossed his. Profiles of living people are added only with their consent.</p>${accessNotice()}
  <h3 class="sect">Units and formations</h3>${units.map(card).join("")||`<p class="empty">Loading…</p>`}
  <h3 class="sect">People</h3>${people.map(card).join("")}`;
};

/* ================= Digital archive ================= */
function archFiles(a){return a.access==="Restricted"?(S.archFiles.get(a.id)?.files||[]):(a.files||[])}
const ACOLLMETA={"Sagat Singh Personal Archive":["SP","#762633"],"Bikaner Ganga Risala Collection":["BG","#8C7438"],"Goa Liberation Collection":["GL","#2f6f6a"],"Nathu La and Cho La Collection":["NL","#3d5a80"],"1971 War Collection":["71","#303B30"],"Oral History Collection":["OH","#6b3f5e"],"Family Photographs Collection":["FP","#7b5a3c"],"Military Documents Collection":["MD","#4a4a42"]};
const collMeta=c=>ACOLLMETA[c]||["AR","#5a5a50"];
const ATYPES=[["Photograph","Photographs"],["Letter","Letters"],["Document","Documents"],["Map","Maps"],["Audio-video","Recordings"],["Oral history","Oral histories"],["Newspaper","Newspapers"]];
const ICONP={Photograph:'<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.6"/><path d="M8 7l1.6-2.5h4.8L16 7"/>',Letter:'<rect x="3" y="6" width="18" height="13" rx="1.5"/><path d="M3.5 7l8.5 6.5L20.5 7"/>',Document:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 15.5h6M9 9h3"/>',Map:'<path d="M3 6l6-2.5 6 2.5 6-2.5v15l-6 2.5-6-2.5-6 2.5z"/><path d="M9 3.5v15M15 6v15"/>',"Audio-video":'<rect x="3" y="6" width="13" height="12" rx="1.5"/><path d="M16 10l5-3v10l-5-3"/>',"Oral history":'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>',Newspaper:'<rect x="3" y="5" width="18" height="15" rx="1"/><path d="M6 9h12M6 12.5h5M6 16h5M13.5 12.5H18v3.5h-4.5z"/>'};
const aIcon=(t,cls)=>`<svg class="${cls||"aicon"}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">${ICONP[t]||ICONP.Document}</svg>`;
const LOCK='<svg class="lock" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const restricted=a=>a.access==="Restricted";
function archThumb(a){
  if(restricted(a))return "";
  if(a.thumb)return a.thumb;
  const im=(a.files||[]).find(x=>/^image\//.test(x.type||""));return im?(im.url||"/_blob/"+im.assetId):"";
}
function archCard(a){
  const [code,col]=collMeta(a.collection),th=archThumb(a),r=restricted(a);
  return `<a class="acard${r?" restricted":""}" href="#archive" data-act="openItem" data-id="${esc(a.id)}" style="--cc:${col}">
    <div class="acard-img">${th?`<img src="${esc(th)}" alt="" loading="lazy">`:`<div class="acard-ph">${aIcon(a.category,"aicon big")}<span>${esc(a.category||"Item")}</span></div>`}
      ${r?`<span class="acard-lock">${LOCK}Restricted</span>`:""}
      <code class="acard-id">${esc(a.id)}</code></div>
    <div class="acard-body"><span class="acard-coll"><i>${esc(code)}</i>${esc(a.collection||"")}</span>
      <b>${esc(a.title)}</b>
      <span class="acard-meta">${aIcon(a.category)}${esc([a.category,a.approxDate].filter(Boolean).join(" · "))}</span></div>
  </a>`;
}
function viewer(a){
  const files=archFiles(a);
  if(restricted(a)&&!S.isAdmin)return `<div class="vw vw-restricted"><div class="vw-lockpanel">${LOCK}<h3>Restricted item</h3><p>The catalogue record is public. The file itself is available to researchers on request.</p>${canPost()&&me()?(S.form==="access"?`<form class="inline" id="accessForm" data-id="${esc(a.id)}" data-title="${esc(a.title)}"><label for="ap">Your purpose</label><input id="ap" name="purpose" required maxlength="500"><div class="actions"><button class="btn small" type="submit">Request access</button><button class="link" type="button" data-act="cancelForm">Cancel</button></div></form>`:`<button class="btn small" data-act="form" data-id="access">Request access</button>`):`<p class="meta">Sign in to request access.</p>`}</div></div>`;
  if(!files.length)return `<div class="vw"><div class="vw-empty">${aIcon(a.category,"aicon big")}<p>No digital copy yet. The item is described here while a scan is arranged.</p></div></div>`;
  const i=Math.min(S.page,files.length-1),f=files[i],url=f.url||("/_blob/"+f.assetId),t=f.type||"",z=S.zoom||1;
  const isImg=t.startsWith("image/");
  const media=isImg?`<div class="zoomwrap" data-zoom="${z}"><img id="zoomimg" src="${esc(url)}" alt="${esc(a.title)}${files.length>1?`, page ${i+1}`:""}" style="transform:translate(${S.panX||0}px,${S.panY||0}px) scale(${z})" draggable="false"></div>`
    :t==="application/pdf"?`<iframe src="${esc(url)}#view=FitH" title="${esc(a.title)}"></iframe>`
    :t.startsWith("video/")?`<video src="${esc(url)}" controls preload="metadata"></video>`
    :t.startsWith("audio/")?`<div class="vw-empty">${aIcon(a.category,"aicon big")}<audio src="${esc(url)}" controls></audio></div>`
    :`<div class="vw-empty"><a href="${esc(url)}" target="_blank" rel="noopener">Open ${esc(f.name||"the file")}</a></div>`;
  return `<div class="vw${restricted(a)?" vw-restricted":""}" id="vw">
    <div class="vw-stage">${media}</div>
    <div class="vw-tools">
      ${isImg?`<button class="vbtn" data-act="zoom" data-id="out" aria-label="Zoom out">−</button><span class="vz">${Math.round(z*100)}%</span><button class="vbtn" data-act="zoom" data-id="in" aria-label="Zoom in">+</button><button class="vbtn wide" data-act="zoom" data-id="reset">Fit</button>`:""}
      ${files.length>1?`<button class="vbtn" data-act="pg" data-id="-1" ${i===0?"disabled":""} aria-label="Previous page">‹</button><span class="vz">Page ${i+1} of ${files.length}</span><button class="vbtn" data-act="pg" data-id="1" ${i===files.length-1?"disabled":""} aria-label="Next page">›</button>`:""}
      <span class="grow"></span>
      <button class="vbtn wide" data-act="fullscreen">Full screen</button>
      <a class="vbtn wide" href="${esc(url)}" target="_blank" rel="noopener">Open original</a>
      ${a.download==="Allowed"||S.isAdmin?`<a class="vbtn wide" href="${esc(url)}" download="${esc(f.name||a.id)}">Download</a>`:""}
    </div>
    ${isImg?`<p class="vw-hint">Scroll or use + and − to zoom. Drag to move around the image.</p>`:""}
  </div>`;
}
function transcriptBlock(a){
  if(!a.transcript)return "";
  const q=S.docq.trim();let lines_=lines(a.transcript),hits=0;
  const body=lines_.map((l,n)=>{let h=esc(l);if(q.length>1){const re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi");if(re.test(l)){hits++;h=h.replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),m=>`<mark>${m}</mark>`)}}return `<p><span class="ln">${n+1}</span>${h}</p>`}).join("");
  return `<section class="dos"><h4>Transcript and text</h4><form id="docSearch" class="inline-form"><input name="q" value="${esc(S.docq)}" placeholder="Search within this document" aria-label="Search within this document"><button class="btn small ghost" type="submit">Find</button></form>${q.length>1?`<p class="meta">${hits} ${hits===1?"line matches":"lines match"}.</p>`:""}<div class="transcript">${body}</div></section>`;
}
function archiveItem(a){
  const [code,col]=collMeta(a.collection),r=restricted(a);
  const facts=[["Date",a.approxDate],["Origin",[a.location,a.creator].filter(Boolean).join(". ")],["Credit",a.donor?`Courtesy of ${a.donor}`:a.creator],["Rights",a.rights],["Access",a.access||"Public"],["Downloading",a.download],["Category",a.category],["Collection",a.collection],["Campaigns",(a.camps||[]).map(campName).join(", ")],["People",a.people],["Units",a.units],["Original owner",a.originalOwner]].filter(x=>x[1]);
  return `<p class="backlink"><a href="#archive" data-act="closeItem">‹ Back to the archive</a></p>
  <div class="aitem${r?" restricted":""}" style="--cc:${col}">
    <div class="aitem-main">${viewer(a)}</div>
    <aside class="aitem-side">
      <div class="aitem-top"><span class="acard-coll"><i>${esc(code)}</i>${esc(a.collection||"")}</span>${r?`<span class="rbadge">${LOCK}Restricted</span>`:`<span class="pbadge">Public</span>`}</div>
      <h2 class="item-h">${esc(a.title)}</h2>
      <p class="aitem-id">Archive ID <code>${esc(a.id)}</code></p>
      ${a.description?`<p class="aitem-desc">${esc(a.description)}</p>`:""}
      <dl class="aitem-facts">${facts.map(([k,x])=>`<dt>${esc(k)}</dt><dd>${esc(x)}</dd>`).join("")}</dl>
      <div class="actions">${correctionLink("archive/"+a.id,a.title)}${S.isAdmin?`<button class="link" data-act="edit" data-id="archive/${esc(a.id)}#transcript">${a.transcript?"Edit transcript":"Add a transcript"}</button>`:""}</div>
    </aside>
  </div>
  ${transcriptBlock(a)}
  ${S.edit===`archive/${a.id}#transcript`?`<form class="panel" id="transForm" data-id="${esc(a.id)}"><label for="tt">Transcript or OCR text <small>(one line per line of the original)</small></label><textarea id="tt" name="transcript" style="min-height:12rem">${esc(a.transcript)}</textarea><label for="tr">Reason</label><input id="tr" name="reason" required value="Transcript added"><div class="actions"><button class="btn small" type="submit">Save</button><button class="link" type="button" data-act="cancelEdit">Cancel</button></div></form>`:""}
  ${S.isAdmin&&S.research?`<section class="dos"><h4>Catalogue record (editors)</h4><p class="meta">Catalogued by ${esc(nameOf(a.reviewedBy))}${a.reviewedAt?`, ${fmtDate(a.reviewedAt)}`:""}. Nature: ${esc(a.nature||"not set")}.</p>${statusControl("archive",a)}${historyPanel("archive/"+a.id)}</section>`:""}
  ${citePanel(`${a.title} (${a.id})`,"archive")}`;
}
VIEWFN.archive=()=>{
  if(S.item){const a=S.archive.find(x=>x.id===S.item);if(a)return archiveItem(a);}
  const f=S.f,vis=S.archive.filter(a=>S.isAdmin||a.status!=="rejected");
  const list=vis.filter(a=>(!f.acoll||a.collection===f.acoll)&&(!f.atype||a.category===f.atype)).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const cnt=(k,v)=>vis.filter(a=>a[k]===v).length;
  const photos=vis.filter(a=>!restricted(a)&&archThumb(a)).slice(-5).reverse();
  const admin=S.isAdmin&&!S.offline;
  return `<section class="alanding">
    <div class="alanding-inner">
      <div class="alanding-text"><p class="eyebrow">SSRF Digital archive</p><h2>Photographs, letters and records of his life</h2>
        <p>Every item carries a permanent identifier, its origin, credit and rights. Originals stay unaltered; what you see are viewing copies.</p>
        <p class="alanding-stats"><b>${vis.length}</b> ${vis.length===1?"item":"items"} catalogued · <b>${ACOLL.filter(c=>cnt("collection",c)).length}</b> of ${ACOLL.length} collections started</p>
        <div class="entry">${contributeBtn("form","archive",S.isAdmin?"Catalogue an item":"Contribute an item")}</div></div>
      <div class="alanding-mosaic n${Math.min(photos.length,5)}">${photos.length?photos.map(a=>`<a href="#archive" data-act="openItem" data-id="${esc(a.id)}" title="${esc(a.title)}"><img src="${esc(archThumb(a))}" alt="${esc(a.title)}" loading="lazy"><code>${esc(a.id)}</code></a>`).join(""):`<div class="mosaic-empty">${aIcon("Photograph","aicon big")}<p>Photographs will appear here as they are catalogued.</p></div>`}</div>
    </div></section>
  ${accessNotice()}${myPendingPanel("archive")}
  ${S.form==="archive"?(canPost()&&me()?archiveForm({}):needJoin("contribute to the archive")):""}
  <div class="atypes" role="group" aria-label="Filter by type"><button class="atype${!f.atype?" on":""}" data-act="atype" data-id="">All <i>${vis.length}</i></button>${ATYPES.map(([k,l])=>`<button class="atype${f.atype===k?" on":""}" data-act="atype" data-id="${esc(k)}">${aIcon(k)}${esc(l)} <i>${cnt("category",k)}</i></button>`).join("")}</div>
  <h3 class="asect">Collections</h3>
  <div class="acolls">${ACOLL.map(c=>{const [code,col]=collMeta(c),n=cnt("collection",c);return `<button class="acoll${f.acoll===c?" on":""}${n?"":" empty"}" style="--cc:${col}" data-act="acoll" data-id="${esc(f.acoll===c?"":c)}"><i>${esc(code)}</i><b>${esc(c.replace(/ Collection$/,""))}</b><span>${n} ${n===1?"item":"items"}</span></button>`}).join("")}</div>
  <h3 class="asect">${f.acoll||f.atype?`${esc(f.atype?ATYPES.find(x=>x[0]===f.atype)?.[1]||f.atype:"Items")}${f.acoll?` in ${esc(f.acoll)}`:""} <button class="link" data-act="aclear">Clear filters</button>`:"All items"}</h3>
  ${!isReady("archive")?`<p class="empty">Loading the archive…</p>`:list.length?`<div class="agrid">${page("archive",list).map(archCard).join("")}</div>${more("archive",list.length)}`:`<p class="empty">${vis.length?"Nothing matches these filters yet.":"The archive's first items will be family photographs, documents and recorded interviews. If you hold any, contribute them."}</p>`}`;
};
function archiveForm(v){
  return `<form class="panel" id="archiveForm"${S.resub?` data-resub="${esc(S.resub)}"`:""}>
    <label for="at">Title <small>(what it is, who, where)</small></label><input id="at" name="title" required maxlength="200" value="${esc(v.title)}">
    <div class="grid2">
      <div><label for="ac">Category</label><select id="ac" name="category">${opts(Object.keys(ACAT),v.category||"Photograph")}</select></div>
      <div><label for="acl">Collection</label><select id="acl" name="collection">${opts(ACOLL,v.collection)}</select></div>
      <div><label for="ad">Approximate date</label><input id="ad" name="approxDate" maxlength="60" value="${esc(v.approxDate)}" placeholder="c. 1967"></div>
      <div><label for="al">Location</label><input id="al" name="location" maxlength="120" value="${esc(v.location)}"></div>
      <div><label for="acr">Creator or photographer</label><input id="acr" name="creator" maxlength="120" value="${esc(v.creator)}" placeholder="Unknown"></div>
      <div><label for="ao">Original owner</label><input id="ao" name="originalOwner" maxlength="160" value="${esc(v.originalOwner)}" placeholder="Family, institution or archive"></div>
      <div><label for="adn">Source or donor</label><input id="adn" name="donor" maxlength="160" value="${esc(v.donor)}"></div>
      <div><label for="ar">Rights</label><select id="ar" name="rights">${opts(RIGHTS,v.rights||"Rights unknown")}</select></div>
      <div><label for="aa">Access</label><select id="aa" name="access">${opts(["Public","Restricted"],v.access||"Public")}</select></div>
      <div><label for="adl">Downloading</label><select id="adl" name="download">${opts(["Allowed","Not allowed"],v.download||"Not allowed")}</select></div>
      <div><label for="apl">Related people</label><input id="apl" name="people" maxlength="200" value="${esc(v.people)}"></div>
      <div><label for="aun">Related units</label><input id="aun" name="units" maxlength="200" value="${esc(v.units)}"></div>
    </div>
    ${campChecks(v.camps)}
    <label for="ax">Description and historical context</label><textarea id="ax" name="description" maxlength="4000" style="min-height:6rem">${esc(v.description)}</textarea>
    <label for="af">Files <small>(scans, photographs, audio or video, up to 20 MB each; several files become pages in order)</small></label>
    ${S.assets?`<input id="af" name="files" type="file" multiple accept="image/*,application/pdf,audio/*,video/*">`:`<p class="meta">File upload isn't available to this account. Describe the item and the foundation will arrange a scan.</p>`}
    ${(v.files||[]).length?`<p class="meta">${v.files.length} file(s) already attached; new files are added after them.</p>`:""}
    <label class="check"><input type="checkbox" name="consent" required> I have the right to share this item, and anyone shown or named in it has agreed or is a public figure</label>
    ${S.isAdmin?`<p class="meta">Catalogued by an editor, the item is published as "Under verification" until another editor verifies it.</p>`:reviewNote}
    <div class="actions"><button class="btn" type="submit">${S.isAdmin?"Catalogue item":"Send for review"}</button><button class="link" type="button" data-act="cancelForm">Cancel</button></div>
  </form>`;
}
function statusControl(col,r){
  if(!S.isAdmin)return r.verNote?`<p class="meta">${esc(VSTAT[r.status||"submitted"])}${r.reviewedBy?` by ${esc(nameOf(r.reviewedBy))}`:""}${r.reviewedAt?`, ${fmtDate(r.reviewedAt)}`:""}: ${esc(r.verNote)}</p>`:"";
  const key=`${col}/${r.id}#status`;
  if(S.edit===key)return `<form class="panel inline" id="statusForm" data-col="${col}" data-id="${esc(r.id)}"><div class="grid2"><div><label for="ss1">Verification status</label><select id="ss1" name="status">${kopts(VSTAT,r.status||"submitted")}</select></div><div><label for="ss2">What was checked, against what</label><input id="ss2" name="verNote" required maxlength="400" value="${esc(r.verNote)}"></div></div><div class="actions"><button class="btn small" type="submit">Save</button><button class="link" type="button" data-act="cancelEdit">Cancel</button></div></form>`;
  return `<p class="meta">${esc(VSTAT[r.status||"submitted"])}${r.reviewedBy?` by ${esc(nameOf(r.reviewedBy))}`:""}${r.reviewedAt?`, ${fmtDate(r.reviewedAt)}`:""}${r.verNote?`: ${esc(r.verNote)}`:""} <button class="link quiet" data-act="edit" data-id="${esc(key)}" ${ownWork(r)?"disabled title='Another editor must verify your own entry'":""}>Change status</button></p>`;
}

/* ================= Library, videos, sources ================= */
const LGROUPS=[["books","Books and biographies",["Biography","Book","Memoir"]],["articles","Articles and newspapers",["Article","Newspaper"]],["records","Official records",["Official record"]],["theses","Theses",["Thesis"]],["films","Films and talks",["Other","Lecture or talk"]]];
const lgroup=k=>(LGROUPS.find(g=>g[2].includes(k))||LGROUPS[4])[0];
const LTYPE={Biography:"Biography",Book:"Book",Memoir:"Memoir",Article:"Article",Newspaper:"News report","Official record":"Official record",Thesis:"Thesis",Other:"Film","Lecture or talk":"Talk"};
const CLOTH=["#5b1d1a","#2f3b2a","#22324a","#4a3524","#3b2a3e"];
const hsh=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)};
const shortTitle=t=>String(t||"").split(/:\s/)[0];
function libCover(b,big){
  const real=libReal(b,big);
  if(real)return real;
  return libDesigned(b,big);
}
function libReal(b,big){
  const urls=[...(b.cover?[b.cover]:[]),...(b.coverIds||[]).map(c=>`https://covers.openlibrary.org/b/${c}-${big?"L":"M"}.jpg?default=false`)];
  if(!urls.length)return "";
  const v=b.status==="verified";
  return `<div class="lcov real${big?" big":""}">${libDesigned(b,big,true)}<img class="lcov-img" src="${esc(urls[0])}" data-alt="${esc(urls.slice(1).join("|"))}" alt="Cover of ${esc(b.title)}" loading="lazy">${v?`<span class="lseal" title="Verified by SSRF">✓</span>`:""}</div>`;
}
function libDesigned(b,big,inner){
  const g=lgroup(b.kind),v=b.status==="verified"&&!inner;
  const seal=v?`<span class="lseal" title="Verified by SSRF">✓</span>`:"";
  if(g==="articles")return `<div class="lcov clip${big?" big":""}"><span class="mast">${esc(b.publisher||b.creator||"")}</span><span class="rule"></span><span class="head">${esc(shortTitle(b.title))}</span><span class="cols"></span>${seal}</div>`;
  if(g==="records")return `<div class="lcov folder${big?" big":""}"><span class="tab">${esc(LTYPE[b.kind]||"Record")}</span><span class="org">${esc(b.creator||b.publisher||"")}</span><span class="head">${esc(shortTitle(b.title))}</span><span class="stamp">${esc(b.year||"")}</span>${seal}</div>`;
  if(g==="films")return `<div class="lcov reel${big?" big":""}"><span class="mast">${esc(b.publisher||"Film")}</span><span class="head">${esc(shortTitle(b.title))}</span><span class="by">${esc(b.year||"")}</span>${seal}</div>`;
  return `<div class="lcov cloth${g==="theses"?" thesis":""}${big?" big":""}${inner?" under":""}" style="--cl:${CLOTH[hsh(b.title)%CLOTH.length]}"><span class="spine"></span><span class="frame"><span class="head">${esc(shortTitle(b.title))}</span><span class="orn">✦</span><span class="by">${esc(String(b.creator||"").replace(/\s*\(Retd\)/,""))}</span></span>${seal}</div>`;
}
const lLinkLabel=b=>/wikipedia\.org/.test(b.link||"")&&lgroup(b.kind)==="books"?"More about the book":({articles:"Read the article",records:"Open the record",films:"More about the film",theses:"Read the thesis"})[lgroup(b.kind)]||"View at the publisher";
function libMeta(b){
  const rows=[["Author",b.creator],["Publisher",b.publisher!==b.creator?b.publisher:""],["Year",b.year],["Type",LTYPE[b.kind]||b.kind]].filter(r=>r[1]);
  return `<dl class="lmeta">${rows.map(([k,x])=>`<dt>${k}</dt><dd>${esc(x)}</dd>`).join("")}</dl>`;
}
function libCard(b){
  const v=b.status==="verified",admin=S.isAdmin&&!S.offline;
  return `<article class="lcard${v?" verified":""}">
    ${b.link?`<a href="${esc(b.link)}" target="_blank" rel="noopener" class="lcov-link" aria-label="${esc(b.linkLabel||lLinkLabel(b))}: ${esc(b.title)}">${libCover(b)}</a>`:libCover(b)}
    <div class="lbody">
      <div class="lstat">${v?`<span class="lver">✓ Verified</span>`:`<span class="lchk">Being checked</span>`}${(b.camps||[]).map(c=>`<span class="lcamp">${esc(VCAMP[c]||campName(c))}</span>`).join("")}</div>
      <h3>${esc(b.title)}</h3>
      ${libMeta(b)}
      ${b.description?`<p class="ldesc">${esc(b.description)}</p>`:""}
      <div class="lacts">${b.link?`<a class="btn small" href="${esc(b.link)}" target="_blank" rel="noopener">${esc(b.linkLabel||lLinkLabel(b))} ↗</a>`:""}${correctionLink("books/"+b.id,b.title)}${admin&&S.research?`<button class="link" data-act="del" data-col="books" data-id="${esc(b.id)}">Delete</button>`:""}</div>
      ${admin&&S.research?statusControl("books",b):""}
    </div>
  </article>`;
}
VIEWFN.library=()=>{
  const f=S.f,q=String(f.lq||"").trim().toLowerCase();
  const all=S.books.filter(b=>b.kind!=="Documentary or video"&&(S.isAdmin||b.status!=="rejected"));
  const match=b=>(!q||[b.title,b.creator,b.publisher,b.description,b.year].join(" ").toLowerCase().includes(q))&&(!f.lgrp||lgroup(b.kind)===f.lgrp)&&(!f.camp||(b.camps||[]).includes(f.camp))&&(!f.lver||b.status==="verified");
  const sorters={new:(a,b)=>String(b.year||"0").localeCompare(String(a.year||"0")),old:(a,b)=>String(a.year||"9999").localeCompare(String(b.year||"9999")),title:(a,b)=>String(a.title).localeCompare(String(b.title))};
  const list=all.filter(match).sort((a,b)=>(b.status==="verified")-(a.status==="verified")||sorters[f.lsort||"new"](a,b));
  const feat=all.filter(b=>b.featured).sort((a,b)=>(a.featureOrder||9)-(b.featureOrder||9));
  const filtered=q||f.lgrp||f.camp||f.lver;
  const gcount=k=>all.filter(b=>lgroup(b.kind)===k).length;
  const head=`<section class="llanding"><div class="llanding-inner">
    <p class="eyebrow">SSRF Research library</p><h2>Books, articles and records on his campaigns</h2>
    <p>Published works, official records and reporting on Lt Gen Sagat Singh, with full bibliographic details. Each entry links to the publisher or original source.</p>
    <form id="libSearch" class="lsearch" role="search"><input name="q" type="search" value="${esc(f.lq||"")}" placeholder="Search by title, author, publisher or year" aria-label="Search the library"><button class="btn" type="submit">Search</button></form>
  </div></section>
  ${accessNotice()}${myPendingPanel("book")}
  <div class="lfilters">
    <div class="atypes" role="group" aria-label="Filter by type"><button class="atype${!f.lgrp?" on":""}" data-act="lgrp" data-id="">All <i>${all.length}</i></button>${LGROUPS.filter(g=>gcount(g[0])).map(([k,l])=>`<button class="atype${f.lgrp===k?" on":""}" data-act="lgrp" data-id="${k}">${esc(l)} <i>${gcount(k)}</i></button>`).join("")}</div>
    <div class="bar"><select data-f="camp" aria-label="Filter by campaign">${kopts(Object.fromEntries(S.camps.map(c=>[c.id,c.name])),f.camp,"All campaigns")}</select><select data-f="lsort" aria-label="Sort">${kopts({new:"Newest first",old:"Oldest first",title:"Title A–Z"},f.lsort||"new")}</select><label class="lverchk"><input type="checkbox" data-act="lver"${f.lver?" checked":""}> Verified only</label><span class="grow"></span>${contributeBtn("form","book","Suggest a publication")}</div>
  </div>
  ${S.form==="book"?(canPost()&&me()?bookForm({}):needJoin("suggest a publication")):""}
  <p class="meta">Looking for documentaries and interviews? They are on the <a href="#videos">Videos</a> page.</p>`;
  if(!isReady("books"))return head+`<p class="empty">Loading…</p>`;
  if(filtered)return head+`<h3 class="asect">${list.length} ${list.length===1?"result":"results"} <button class="link" data-act="lclear">Clear search and filters</button></h3>${list.length?`<div class="lgrid">${list.map(libCard).join("")}</div>`:`<p class="empty">Nothing matches. Try another word or clear the filters.</p>`}`;
  return head+`
  ${feat.length?`<h2 class="sect">Featured publication</h2>${feat.map(b=>`<section class="lfeat">${b.link?`<a href="${esc(b.link)}" target="_blank" rel="noopener" class="lcov-link">${libCover(b,true)}</a>`:libCover(b,true)}<div class="lbody"><div class="lstat">${b.status==="verified"?`<span class="lver">✓ Verified</span>`:""}<span class="lcamp">The standard biography</span></div><h3>${esc(b.title)}</h3>${libMeta(b)}${b.description?`<p class="ldesc">${esc(b.description)}</p>`:""}<div class="lacts">${b.link?`<a class="btn" href="${esc(b.link)}" target="_blank" rel="noopener">${esc(b.linkLabel||lLinkLabel(b))} ↗</a>`:""}${correctionLink("books/"+b.id,b.title)}</div></div></section>`).join("")}`:""}
  ${LGROUPS.map(([k,l,kinds])=>{const g=list.filter(b=>lgroup(b.kind)===k&&!b.featured);return g.length?`<h2 class="sect">${esc(l)}</h2><div class="lgrid">${g.map(libCard).join("")}</div>`:""}).join("")}`;
};
const VTYPES=["Documentary","Short","Interview","Speech","Talk or lecture","Commemoration"];
const VTALK=new Set(["Interview","Speech","Talk or lecture","Commemoration"]);
const ytId=u=>(String(u||"").match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/)||[])[1]||"";
const vHost=u=>{try{const h=new URL(u).hostname.replace(/^www\./,"");return /youtu/.test(h)?"YouTube":({"thelallantop.com":"The Lallantop","thequint.com":"The Quint"})[h]||h}catch(e){return ""}};
const VCAMP={goa:"Goa 1961",nathula:"Nathu La 1967",meghna:"1971 war"};
function vCard(b,big){
  const id=ytId(b.link),host=vHost(b.link),camp=(b.camps||[]).length===1?(VCAMP[b.camps[0]]||campName(b.camps[0])):(b.camps||[]).length>1?"His career":"";
  const meta=[b.creator,b.year,b.duration].filter(Boolean).map(esc).join(" · ");
  const admin=S.isAdmin&&!S.offline;
  return `<article class="vcard${big?" big":""}">
    <a class="vthumbwrap" href="${esc(b.link)}" target="_blank" rel="noopener" aria-label="Watch ${esc(b.title)} on ${esc(host)}">
      <div class="vposter"><span class="vposter-camp">${esc(camp||b.vtype||"Video")}</span><span class="vposter-title">${esc(b.title)}</span></div>
      ${id?`<img class="vthumb" src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg" alt="" loading="lazy">`:""}
      <span class="vplay" aria-hidden="true"></span>
      ${b.duration?`<span class="vdur">${esc(b.duration)}</span>`:""}
      ${b.vtype&&b.vtype!=="Documentary"?`<span class="vtype">${esc(b.vtype)}</span>`:""}
    </a>
    <div class="vbody">
      <h3><a href="${esc(b.link)}" target="_blank" rel="noopener">${esc(b.title)}</a></h3>
      ${meta?`<p class="vmeta">${meta}</p>`:""}
      ${b.description?`<p class="vdesc">${esc(b.description)}</p>`:""}
      <p class="vcredit">Original on <a href="${esc(b.link)}" target="_blank" rel="noopener">${esc(host||"source site")}</a>${b.creator?`, by ${esc(b.creator)}`:", credited to the channel that uploaded it"}. Views and credit stay with the creator.</p>
      <div class="actions">${correctionLink("books/"+b.id,b.title)}${admin&&S.research?`<button class="link" data-act="del" data-col="books" data-id="${esc(b.id)}">Delete</button>`:""}</div>
      ${admin&&S.research?statusControl("books",b):""}
    </div>
  </article>`;
}
VIEWFN.videos=()=>{
  const f=S.f,all=S.books.filter(b=>b.kind==="Documentary or video"&&(S.isAdmin||b.status!=="rejected"));
  const by=(a,b)=>(a.featureOrder||99)-(b.featureOrder||99)||String(a.createdAt).localeCompare(String(b.createdAt));
  const grid=(l,big)=>`<div class="vgrid${big?" big":""}">${l.sort(by).map(b=>vCard(b,big)).join("")}</div>`;
  const head=`<h2>Videos</h2>
  <p class="sub">Documentaries, interviews, talks and commemorations about him, made by other people. Every card opens the original video, so views and credit stay with its creator.</p>
  ${accessNotice()}${myPendingPanel("book")}
  <div class="bar"><select data-f="camp" aria-label="Filter by campaign">${kopts(Object.fromEntries(S.camps.map(c=>[c.id,c.name])),f.camp,"All campaigns")}</select><span class="meta">${all.length} videos</span><span class="grow"></span>${contributeBtn("form","book","Suggest a video")}</div>
  ${S.form==="book"?(canPost()&&me()?bookForm({},"Documentary or video"):needJoin("suggest a video")):""}`;
  if(!isReady("books"))return head+`<p class="empty">Loading…</p>`;
  if(f.camp){const l=all.filter(b=>(b.camps||[]).includes(f.camp));return head+(l.length?grid(l):`<p class="empty">No videos for this campaign yet.</p>`);}
  const feat=all.filter(b=>b.featured),rest=all.filter(b=>!b.featured);
  const talks=rest.filter(b=>VTALK.has(b.vtype)),docs=rest.filter(b=>!VTALK.has(b.vtype));
  const groups=[...S.camps.map(c=>[c.name,docs.filter(b=>(b.camps||[]).length===1&&b.camps[0]===c.id)]),["His life and career",docs.filter(b=>(b.camps||[]).length!==1)]];
  return head+`
  ${feat.length?`<h2 class="sect">Featured documentaries</h2>${grid(feat,true)}`:""}
  ${groups.filter(g=>g[1].length).map(([n,l])=>`<h2 class="sect">${esc(n)}</h2>${grid(l)}`).join("")}
  ${talks.length?`<h2 class="sect">Interviews, speeches, lectures and commemorations</h2>${grid(talks)}`:""}`;
};
document.addEventListener("error",e=>{const t=e.target;if(t&&t.classList&&t.classList.contains("vthumb"))t.remove()},true);
document.addEventListener("load",e=>{const t=e.target;if(t&&t.classList&&t.classList.contains("vthumb")&&t.naturalWidth<=120)t.remove()},true);
function libraryView(force){
  const f=S.f,kind=force||f.bkind,rank=k=>k==="Biography"?0:1;
  const list=S.books.filter(b=>(force?b.kind===force:(!kind||b.kind===kind))&&(!f.camp||(b.camps||[]).includes(f.camp))&&(S.isAdmin||b.status!=="rejected"))
    .sort((a,b)=>(b.status==="verified")-(a.status==="verified")||rank(a.kind)-rank(b.kind)||String(a.createdAt).localeCompare(String(b.createdAt)));
  const v=force?"videos":"library";
  return `<h2>${force?"Videos":"Library"}</h2>
  <p class="sub">${force?"Documentaries, explainers, interviews and ceremony footage. Every entry links to the original upload, so views and credit stay with the people who made it. The foundation only lists them.":"Books, records, articles, theses and films about him, catalogued with enough detail to find and cite them."}</p>
  ${accessNotice()}${myPendingPanel("book")}
  <div class="bar">${force?"":`<select data-f="bkind" aria-label="Filter by kind">${opts(BKINDS,f.bkind,"Everything")}</select>`}
  <select data-f="camp" aria-label="Filter by campaign">${kopts(Object.fromEntries(S.camps.map(c=>[c.id,c.name])),f.camp,"All campaigns")}</select>
  <span class="meta">${list.length} ${list.length===1?"entry":"entries"}</span><span class="grow"></span>${contributeBtn("form","book",force?"Suggest a video":"Suggest an item")}</div>
  ${S.form==="book"?(canPost()&&me()?bookForm({},force):needJoin("suggest an item")):""}
  ${!isReady("books")?`<p class="empty">Loading…</p>`:list.length?page(v,list).map(b=>`<article class="story">
      <div><span class="tag">${esc(b.kind)}</span>${natureTag(b.nature)}${vTag(b.status)}${(b.camps||[]).map(c=>`<span class="tag">${esc(campName(c))}</span>`).join("")}</div>
      <h3>${esc(b.title)}</h3>
      <div class="meta">${b.creator?`${b.kind==="Documentary or video"?"Created by ":""}${esc(b.creator)}`:""}${b.publisher?`${b.creator?". ":""}${esc(b.publisher)}`:""}${b.year?`, ${esc(b.year)}`:""}${b.isbn?`. ${esc(b.isbn)}`:""}${b.pages?`. Pages ${esc(b.pages)}`:""}</div>
      ${b.description?`<p class="body">${esc(b.description)}</p>`:""}
      ${b.note?`<p class="meta"><b>SSRF research note:</b> ${esc(b.note)}</p>`:""}
      ${statusControl("books",b)}${historyPanel("books/"+b.id)}
      <div class="actions">${b.link?`<a href="${esc(b.link)}" target="_blank" rel="noopener">${/youtube\.com|youtu\.be/i.test(b.link)?"Watch on YouTube":"More details"}</a>`:""}${correctionLink("books/"+b.id,b.title)}${S.isAdmin?`<button class="link" data-act="del" data-col="books" data-id="${b.id}">Delete</button>`:""}</div></article>`).join("")+more(v,list.length):`<p class="empty">Nothing here yet.</p>`}`;
}
function bookForm(v,force){
  return `<form class="panel" id="bookForm"${S.resub?` data-resub="${esc(S.resub)}"`:""}>
    <label for="bt">Full title</label><input id="bt" name="title" required maxlength="240" value="${esc(v.title)}">
    <div class="grid2">
      <div><label for="bc">Author, editor or channel</label><input id="bc" name="creator" required maxlength="160" value="${esc(v.creator)}"></div>
      <div><label for="bk">Kind</label><select id="bk" name="kind">${opts(BKINDS,v.kind||force||"Book")}</select></div>
      <div><label for="bp">Publisher or institution</label><input id="bp" name="publisher" maxlength="160" value="${esc(v.publisher)}"></div>
      <div><label for="by">Year</label><input id="by" name="year" maxlength="20" value="${esc(v.year)}"></div>
      <div><label for="bi">ISBN or archive reference</label><input id="bi" name="isbn" maxlength="80" value="${esc(v.isbn)}"></div>
      <div><label for="bg">Relevant pages</label><input id="bg" name="pages" maxlength="80" value="${esc(v.pages)}"></div>
      <div><label for="bq">Nature of the material</label><select id="bq" name="nature">${opts(NATURE,v.nature,"Not sure")}</select></div>
      ${(force||v.kind)==="Documentary or video"?`<div><label for="bvt">Video type</label><select id="bvt" name="vtype">${opts(VTYPES,v.vtype||"Documentary")}</select></div><div><label for="bdu">Duration <small>(e.g. 12:40)</small></label><input id="bdu" name="duration" maxlength="20" value="${esc(v.duration)}"></div>`:""}
    </div>
    ${campChecks(v.camps)}
    <label for="bd">What it covers</label><textarea id="bd" name="description" maxlength="1500" style="min-height:5rem">${esc(v.description)}</textarea>
    <label for="bl">Link <small>(publisher page, archive, video)</small></label><input id="bl" name="link" type="url" placeholder="https://" value="${esc(v.link)}">
    ${reviewNote}<div class="actions"><button class="btn" type="submit">Send for review</button><button class="link" type="button" data-act="cancelForm">Cancel</button></div></form>`;
}
const NATCOL={"Primary source":"#762633","Oral history":"#6b3f5e","Family testimony":"#8C7438","Secondary research":"#3d5a80","Tertiary source":"#6a6a60"};
function srcUsage(k){
  const u={Biography:0,Campaigns:0,Register:0};
  for(const c of S.claims)if((c.cites||[]).some(x=>x.s===k))u[c.scope==="life"?"Biography":"Campaigns"]++;
  for(const p of S.places)if((p.cites||[]).some(x=>x.s===k))u.Register++;
  for(const c of S.camps){const keys=[...Object.keys(c).filter(f=>f.endsWith("Cites")).flatMap(f=>c[f]||[]),...(c.chronology||[]).map(r=>r.s),...(c.command||[]).map(n=>n.cite)];if(keys.includes(k))u.Campaigns++;}
  return u;
}
VIEWFN.sources=()=>{
  const f=S.f,q=String(f.sq||"").trim().toLowerCase();
  const all=[...S.sources.values()].map(s=>{const u=srcUsage(s.id);return {...s,u,n:u.Biography+u.Campaigns+u.Register}});
  const max=Math.max(1,...all.filter(s=>s.nature!=="Tertiary source").map(s=>s.n));
  const list=all.filter(s=>(!f.nature||s.nature===f.nature)&&(!q||[s.id,s.title,s.author,s.publisher,s.date,s.note].join(" ").toLowerCase().includes(q)))
    .sort({cited:(a,b)=>b.n-a.n||String(a.title).localeCompare(String(b.title)),title:(a,b)=>String(a.title).localeCompare(String(b.title)),nature:(a,b)=>NATURE.indexOf(a.nature)-NATURE.indexOf(b.nature)||b.n-a.n}[f.ssort||"nature"]);
  const cnt=n=>all.filter(s=>s.nature===n).length;
  const card=s=>{const key=s.nature!=="Tertiary source"&&s.n>=Math.max(3,Math.ceil(max*.5)),col=NATCOL[s.nature]||"#6a6a60",bars=Math.min(5,Math.round(5*s.n/max));
    return `<article class="scard${key?" key":""}${s.n?"":" unused"}" id="src-${esc(s.id)}" style="--nc:${col}">
      <div class="scard-top"><span class="snat">${esc(s.nature||"Not classified")}</span><code class="sid" title="Source ID used in citations">${esc(s.id)}</code></div>
      <h3>${s.url&&/^https?:|^\/_blob\//.test(s.url)?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title||s.id)}</a>`:esc(s.title||s.id)}</h3>
      <p class="sauth">${esc([s.author,s.publisher!==s.author?s.publisher:""].filter(Boolean).join(" · "))}${s.date&&s.date!=="Not stated"&&s.date!=="None"?` <span>· ${esc(s.date)}</span>`:""}</p>
      <div class="suse"><span class="smeter" aria-hidden="true">${[1,2,3,4,5].map(i=>`<i${i<=bars?' class="on"':""}></i>`).join("")}</span><b>${s.n?`Cited ${s.n} ${s.n===1?"time":"times"}`:"Not yet cited"}</b>${key?`<span class="skey">Key source</span>`:""}${s.n?`<span class="swhere">${Object.entries(s.u).filter(x=>x[1]).map(([k,x])=>`${k} ${x}`).join(" · ")}</span>`:""}</div>
      ${s.note?`<div class="snote"><span>Research note</span>${esc(s.note)}</div>`:""}
      ${s.url?`<p class="sopen"><a href="${esc(s.url)}" target="_blank" rel="noopener">Open the source ↗</a>${s.accessed?` <span class="meta">Accessed ${esc(s.accessed)}</span>`:""}</p>`:""}
    </article>`};
  return `<section class="llanding"><div class="llanding-inner">
    <p class="eyebrow">SSRF Sources and evidence</p><h2>Every source the foundation cites</h2>
    <p>Each source is classified by the nature of the material, so readers can see what kind of evidence stands behind every entry. The short ID on each card is the reference editors use in citations.</p>
    <form id="srcSearch" class="lsearch" role="search"><input name="q" type="search" value="${esc(f.sq||"")}" placeholder="Search by title, author, publisher or source ID" aria-label="Search sources"><button class="btn" type="submit">Search</button></form>
  </div></section>${accessNotice()}
  <h2 class="sect">Evidence classification</h2>
  <div class="nats">${NATURE.map(n=>`<button class="natcard${f.nature===n?" on":""}" style="--nc:${NATCOL[n]}" data-act="snat" data-id="${esc(f.nature===n?"":n)}"><span class="snat">${esc(n)}</span><p>${esc(NATURE_HELP[n])}</p><i>${cnt(n)} ${cnt(n)===1?"source":"sources"}</i></button>`).join("")}</div>
  <div class="bar" style="margin-top:1rem"><select data-f="ssort" aria-label="Sort">${kopts({nature:"By classification",cited:"Most cited first",title:"Title A–Z"},f.ssort||"nature")}</select>${f.nature||q?`<button class="link" data-act="sclear">Clear search and filter</button>`:""}<span class="meta">${list.length} of ${all.length} sources</span><span class="grow"></span>${S.isAdmin?`<button class="btn" data-act="form" data-id="source">Add a source</button>`:""}</div>
  ${S.form==="source"&&S.isAdmin?sourceForm():""}
  ${list.length?`<div class="sgrid">${list.map(card).join("")}</div>`:`<p class="empty">No source matches. Try another word or clear the filter.</p>`}`;
};
function sourceForm(){return `<form class="panel" id="sourceForm"><div class="grid2">
  <div><label for="si">Short id <small>(letters and digits)</small></label><input id="si" name="id" required pattern="[A-Za-z0-9]+" maxlength="20"></div>
  <div><label for="sn">Nature</label><select id="sn" name="nature">${opts(NATURE,"Secondary research")}</select></div>
  <div><label for="sa">Author or issuing institution</label><input id="sa" name="author" required></div>
  <div><label for="st2">Exact title</label><input id="st2" name="title" required></div>
  <div><label for="sp">Publisher</label><input id="sp" name="publisher"></div>
  <div><label for="sd">Publication date</label><input id="sd" name="date" required></div>
  <div><label for="su">Link</label><input id="su" name="url" type="url" placeholder="https://"></div>
  <div><label for="sac">Date accessed</label><input id="sac" name="accessed" value="${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}"></div></div>
  <label for="sno">Research note</label><input id="sno" name="note" maxlength="400">
  <div class="actions"><button class="btn small" type="submit">Add source</button><button class="link" type="button" data-act="cancelForm">Cancel</button></div></form>`}

/* ================= Stories ================= */
VIEWFN.stories=()=>{
  const f=S.f;
  const list=S.stories.filter(s=>(!f.kind||s.kind===f.kind)&&(!f.era||s.era===f.era)&&(!f.assess||s.assessment===f.assess)&&(!f.nature||s.nature===f.nature)&&(!f.camp||(s.camps||[]).includes(f.camp)));
  return `<h2>Stories</h2>
  <p class="sub">Accounts, memoirs and anecdotes from members. Each is checked by an editor, labelled by the nature of the material and by how well its claims are supported.</p>
  ${accessNotice()}${myPendingPanel("story")}
  <div class="bar">
    <select data-f="kind" aria-label="Type">${opts(KINDS,f.kind,"All types")}</select>
    <select data-f="era" aria-label="Period">${opts(ERAS,f.era,"All periods")}</select>
    <select data-f="nature" aria-label="Nature of material">${opts(NATURE,f.nature,"Any material")}</select>
    <select data-f="assess" aria-label="Assessment">${kopts(ASSESS,f.assess,"Any assessment")}</select>
    <span class="grow"></span>${contributeBtn("form","story","Contribute a story")}
  </div>
  ${S.form==="story"?(canPost()&&me()?storyForm({}):needJoin("share a story")):""}
  ${!isReady("stories")?`<p class="empty">Loading stories…</p>`:list.length?page("stories",list).map(storyCard).join("")+more("stories",list.length):`<p class="empty">${S.stories.length?"No stories match these filters.":"No published stories yet. If you served with him, knew him, or have researched his campaigns, contribute yours."}</p>`}`;
};
function storyCard(s){
  const open=S.open.has(s.id),sal=[...S.salutes.values()].filter(a=>a.includes(s.id)).length,mine=(S.salutes.get(S.uid)||[]).includes(s.id);
  return `<article class="story" id="story-${s.id}">
    <div>${memberTag}<span class="tag">${esc(s.kind)}</span><span class="tag">${esc(s.era)}</span>${natureTag(s.nature)}${assessTag(s.assessment)}</div>
    <h3>${esc(s.title)}</h3>
    <div class="meta">${esc(s.authorName||"A member")}${S.isAdmin&&s.attribution==="anonymous"?` (${esc(nameOf(s.authorId))}, visible to editors)`:""}. ${fmtDate(s.createdAt)}${s.reviewedAt?`. Reviewed ${fmtDate(s.reviewedAt)}`:""}</div>
    ${s.narrator?`<div class="meta">Account of ${esc(s.narrator)}${s.narratorBg?`, ${esc(s.narratorBg)}`:""}</div>`:""}
    ${s.when||s.where||s.unit?`<div class="meta">${esc([s.when,s.where,s.unit].filter(Boolean).join(" · "))}</div>`:""}
    <div class="body ${open?"":"clip"}">${esc(s.body)}</div>
    ${open&&s.sources?`<p class="meta"><b>Sources:</b> ${esc(s.sources)}</p>`:""}
    ${open?historyPanel("stories/"+s.id):""}
    <div class="actions">
      ${(s.body&&s.body.length>220)||s.sources?`<button class="link" data-act="toggle" data-id="${s.id}">${open?"Show less":"Read in full"}</button>`:""}
      ${s.video?`<a href="${esc(s.video)}" target="_blank" rel="noopener">Watch the video</a>`:""}
      <button class="salute" data-act="salute" data-id="${s.id}" aria-pressed="${mine}" ${canPost()&&me()?"":"disabled"}>Salute ${sal||""}</button>
      ${correctionLink("stories/"+s.id,s.title)}
      ${S.isAdmin?`<select data-act="setAssess" data-id="${s.id}" aria-label="Assessment" ${ownWork(s)?"disabled title='Another editor must assess your own story'":""}>${kopts(ASSESS,s.assessment)}</select><button class="link" data-act="unpublish" data-id="${s.id}">Unpublish</button>`:""}
    </div></article>`;
}
function storyForm(v){
  return `<form class="panel" id="storyForm"${S.resub?` data-resub="${esc(S.resub)}"`:""}>
    <div class="grid2"><div><label for="sk">Type</label><select id="sk" name="kind">${opts(KINDS,v.kind||"Anecdote")}</select></div>
    <div><label for="se">Period</label><select id="se" name="era">${opts(ERAS,v.era||"Goa 1961")}</select></div></div>
    <label for="sp">Where does this come from?</label>
    <select id="sp" name="prov"><option value="first"${v.prov==="first"?" selected":""}>I saw or heard it myself</option><option value="family"${v.prov==="family"?" selected":""}>It was passed down in my family</option><option value="research"${v.prov==="research"?" selected":""}>I found it in documents or published sources</option></select>
    <label for="st">Title</label><input id="st" name="title" required maxlength="140" value="${esc(v.title)}">
    <label for="sb">The account</label><textarea id="sb" name="body" required maxlength="20000">${esc(v.body)}</textarea>
    <div class="grid2">
      <div><label for="sn">Whose account is it? <small>(if not yours)</small></label><input id="sn" name="narrator" maxlength="120" value="${esc(v.narrator)}"></div>
      <div><label for="snb">Their background</label><input id="snb" name="narratorBg" maxlength="160" value="${esc(v.narratorBg)}" placeholder="Served in 2/3 GR, 1971"></div>
      <div><label for="sw">When did it happen?</label><input id="sw" name="when" maxlength="60" value="${esc(v.when)}"></div>
      <div><label for="sh">Where?</label><input id="sh" name="where" maxlength="100" value="${esc(v.where)}"></div>
      <div><label for="su">Unit or formation</label><input id="su" name="unit" maxlength="100" value="${esc(v.unit)}"></div>
      <div><label for="sa">Show my name as</label><select id="sa" name="attribution"><option value="named">My name</option><option value="initials"${v.attribution==="initials"?" selected":""}>My initials</option><option value="anonymous"${v.attribution==="anonymous"?" selected":""}>A member (editors still see it)</option></select></div>
    </div>
    ${campChecks(v.camps)}
    <label for="ss">Sources <small>(books and pages, documents, people you spoke to)</small></label><input id="ss" name="sources" maxlength="600" value="${esc(v.sources)}">
    <label for="sv">Video link <small>(optional, https)</small></label><input id="sv" name="video" type="url" placeholder="https://" value="${esc(v.video)}">
    <label class="check"><input type="checkbox" name="consent" required> I have the right to share this, and anyone named in it has agreed or is a public figure</label>
    <label class="check"><input type="checkbox" name="editOk" ${v.editOk===false?"":"checked"}> Editors may correct spelling and clarity without changing the meaning</label>
    ${reviewNote}<div class="actions"><button class="btn" type="submit">${S.resub?"Resubmit for review":"Send for review"}</button><button class="link" type="button" data-act="cancelForm">Cancel</button></div></form>`;
}

/* ================= Members and chapters ================= */
const chapterNames=()=>S.chapters.length?S.chapters.map(c=>c.name):FALLBACK_CHAPTERS;
const MGROUPS=[["founding","Founding members","#762633",["Founding member"]],["veterans","Veterans","#303B30",["Veteran member"]],["family","Family members","#8C7438",["Family and legacy member"]],["researchers","Researchers","#3d5a80",["Research member"]],["academics","Academics and institutions","#2f6f6a",["Academic member","Institutional member"]],["students","Students","#6b3f5e",["Student member"]],["supporters","Supporters and volunteers","#5a5a50",["Patron or supporter","Volunteer member"]]];
const mgroup=c=>MGROUPS.find(g=>g[3].includes(c))||MGROUPS[6];
function memberCard(id,m,count){
  const [gk,gl,col]=mgroup(m.category||m.role),tags=String(m.interests||"").split(/[,;]\s*/).map(x=>x.trim()).filter(Boolean);
  return `<article class="mcard" style="--mc:${col}">
    <div class="mhead">${m.photo&&m.photoConsent?`<img class="mphoto" src="${esc(m.photo)}" alt="${esc(m.name)}" loading="lazy">`:`<span class="mseal" aria-hidden="true">${esc(initials(m.name))}</span>`}
      <div><p class="mcat">${esc(m.category||m.role||"Member")}</p><h3>${m.title?`<span class="mtitle">${esc(m.title)}</span> `:""}${esc(m.name)}${id===S.uid?` <small>(you)</small>`:""}</h3>
      ${m.affiliation||(m.chapter&&m.showChapter!==false)?`<p class="maff">${esc([m.affiliation,m.chapter&&m.showChapter!==false?`${m.chapter} chapter`:""].filter(Boolean).join(" · "))}</p>`:""}</div></div>
    ${m.connection?`<p class="mconn">${esc(m.connection)}</p>`:""}
    ${tags.length||(m.camps||[]).length?`<dl class="mint">${(m.camps||[]).length?`<dt>Research focus</dt><dd>${m.camps.map(c=>`<span class="mtag camp">${esc(VCAMP[c]||campName(c))}</span>`).join("")}</dd>`:""}${tags.length?`<dt>Interests</dt><dd>${tags.map(t=>`<span class="mtag">${esc(t)}</span>`).join("")}</dd>`:""}</dl>`:""}
    ${m.showContrib&&count(id)?`<p class="mcontrib">${count(id)} published ${count(id)===1?"contribution":"contributions"}</p>`:""}
  </article>`;
}
VIEWFN.members=()=>{
  const f=S.f,count=id=>S.stories.filter(s=>s.authorId===id&&s.status!=="rejected").length+S.archive.filter(a=>a.authorId===id).length;
  const all=[...S.members.entries()];
  const list=all.filter(([id,m])=>(!f.mgrp||mgroup(m.category||m.role)[0]===f.mgrp)&&(!f.chapter||m.chapter===f.chapter)).sort((a,b)=>String(a[1].name).localeCompare(String(b[1].name)));
  const gcount=k=>all.filter(([,m])=>mgroup(m.category||m.role)[0]===k).length;
  const head=`<section class="llanding mlanding"><div class="llanding-inner">
    <p class="eyebrow">SSRF Members</p><h2>The foundation's members</h2>
    <p>Veterans, families, researchers, academics, students and supporters who work with the foundation and have chosen to be listed. Photographs appear only where a member has consented. Members who keep their profile private are not shown.</p>
    <p class="alanding-stats"><b>${all.length}</b> listed ${all.length===1?"member":"members"} · <b>${chapterNames().length}</b> chapters</p>
  </div></section>${accessNotice()}
  <div class="mgroups">${MGROUPS.map(([k,l,c])=>`<button class="mgrp${f.mgrp===k?" on":""}" style="--mc:${c}" data-act="mgrp" data-id="${f.mgrp===k?"":k}"><b>${esc(l)}</b><span>${gcount(k)}</span></button>`).join("")}</div>
  <div class="bar"><select data-f="chapter" aria-label="Chapter">${opts(chapterNames(),f.chapter,"All chapters")}</select>${f.mgrp||f.chapter?`<button class="link" data-act="mclear">Show all members</button>`:""}<span class="grow"></span>${me()?`<a class="btn small ghost" href="#account">Edit my profile</a>`:`<a class="btn small" href="#account">Become a member</a>`}</div>`;
  if(!isReady("members"))return head+`<p class="empty">Loading…</p>`;
  if(!list.length)return head+`<p class="empty">No listed members match.</p>`;
  if(f.mgrp||f.chapter)return head+`<div class="mgrid">${list.map(([id,m])=>memberCard(id,m,count)).join("")}</div>`;
  return head+MGROUPS.map(([k,l,c])=>{const g=list.filter(([,m])=>mgroup(m.category||m.role)[0]===k);return g.length?`<h2 class="sect msect" style="--mc:${c}">${esc(l)}</h2><div class="mgrid">${g.map(([id,m])=>memberCard(id,m,count)).join("")}</div>`:""}).join("");
};
const INDIA={W:600,H:670,d:"M414.5 336.7L415.2 337.8L414.8 338.2L415.0 339.0L413.7 338.2L413.5 337.1L413.9 336.6L414.5 336.7ZM406.7 335.0L406.3 337.7L405.8 337.8L406.4 337.9L406.1 338.8L405.4 339.0L404.1 338.4L404.5 336.6L406.0 333.6L406.7 335.0ZM414.3 335.2L414.5 336.6L413.9 336.6L413.5 336.9L413.3 335.7L413.9 335.0L414.3 335.2ZM404.2 332.8L404.9 330.8L406.1 330.4L404.8 332.5L404.2 332.8ZM197.2 44.9L200.4 45.6L202.9 44.1L204.8 45.4L205.3 43.3L209.6 43.5L211.4 39.8L222.3 36.7L223.4 34.5L226.8 35.8L231.5 35.5L233.0 34.2L234.9 34.6L235.8 37.1L237.5 36.1L240.1 41.6L242.9 43.0L245.9 42.4L245.2 43.4L247.0 46.2L249.9 43.0L254.0 45.0L251.5 47.6L251.5 50.8L249.7 52.7L249.9 57.5L248.6 57.9L247.4 61.4L241.7 63.1L241.9 66.2L236.2 66.8L238.2 71.3L235.9 72.3L234.2 76.3L226.1 75.6L224.0 77.0L226.8 81.6L226.5 83.1L228.0 84.1L224.4 84.4L225.1 89.5L228.3 93.4L230.5 92.6L234.3 93.6L232.7 97.6L237.2 102.7L237.0 104.5L234.4 107.8L231.7 107.0L228.8 108.6L228.2 111.0L225.6 111.7L221.9 108.7L221.1 104.1L214.3 107.6L215.8 109.4L216.2 113.0L221.9 119.0L220.4 122.9L223.2 127.1L220.7 129.2L222.2 130.6L221.9 133.4L224.3 133.9L228.2 130.4L234.6 139.5L236.2 139.3L238.1 141.3L241.0 139.9L243.3 140.6L244.5 142.6L250.6 145.1L250.2 148.9L257.8 151.2L261.7 154.4L266.2 156.0L265.5 157.3L263.8 156.5L260.6 161.1L257.8 162.1L255.6 165.6L253.1 166.6L253.9 169.8L250.7 173.0L252.1 175.8L251.7 178.1L250.8 177.8L251.2 179.4L248.8 180.3L247.4 186.2L256.1 192.0L255.8 189.6L257.1 189.1L266.2 195.3L269.7 196.0L271.8 200.8L274.4 200.3L275.0 201.9L283.0 206.7L286.6 205.3L294.1 210.5L299.2 209.6L299.7 214.2L308.6 215.3L311.2 217.9L313.0 216.1L312.6 214.7L317.0 214.9L321.9 217.6L321.6 215.5L325.1 215.7L327.6 213.9L330.3 216.7L336.8 217.7L338.1 220.2L337.2 223.9L343.5 225.7L345.3 227.3L344.7 228.0L348.0 227.7L348.4 230.0L350.8 230.4L356.6 227.6L358.6 229.0L358.7 232.3L361.0 234.1L364.5 232.0L368.2 233.6L370.5 233.0L378.3 237.2L385.0 233.7L385.4 236.6L390.3 238.7L392.8 236.8L395.5 238.0L401.1 235.8L403.4 238.5L405.1 237.1L406.9 230.4L405.9 225.2L403.0 222.4L404.6 217.8L404.1 214.4L407.2 208.1L405.6 205.4L406.1 204.4L411.4 204.1L415.8 201.2L419.7 203.4L420.7 206.7L418.3 212.9L421.3 218.7L419.1 219.6L417.9 221.9L420.4 222.6L420.5 226.1L421.4 225.0L425.6 229.0L430.4 227.8L435.7 229.6L435.3 230.8L439.9 231.2L446.4 229.7L447.2 227.9L449.6 227.0L456.7 229.8L464.2 228.7L468.9 229.6L470.3 228.3L475.9 229.0L479.9 226.6L483.1 228.1L484.4 225.7L482.6 223.2L482.7 219.4L484.4 218.8L482.3 214.7L475.1 214.6L473.4 211.5L474.9 208.8L480.5 209.7L486.8 206.1L488.2 208.0L490.3 207.2L490.9 208.1L496.3 204.1L496.4 202.5L494.9 202.0L495.3 200.5L500.1 199.4L510.0 189.6L515.7 189.6L526.4 183.9L528.5 181.9L526.8 180.5L527.1 179.2L533.6 176.2L535.0 175.8L537.2 179.0L541.4 179.8L540.9 178.8L546.1 181.0L546.9 179.6L549.1 179.8L549.5 178.4L550.9 179.8L550.9 178.4L552.7 178.5L552.9 177.5L554.9 178.1L557.0 175.1L558.2 175.8L561.7 174.3L566.6 178.4L564.3 181.7L567.2 180.1L569.5 183.7L570.9 183.8L573.1 188.1L573.3 189.3L571.4 189.1L568.7 193.0L570.5 194.6L570.4 192.2L574.7 190.7L578.9 196.2L582.8 196.0L587.4 199.3L586.5 202.4L588.1 203.4L587.5 206.3L585.2 205.8L578.2 212.0L578.4 215.3L583.5 221.9L583.0 223.0L577.7 221.0L578.1 219.4L574.5 217.0L571.0 218.8L565.2 219.0L561.1 221.1L559.6 223.8L556.8 224.6L555.2 227.4L551.3 228.7L549.5 231.3L543.9 233.0L542.2 236.6L543.6 238.1L543.3 244.0L544.6 244.6L541.2 248.3L541.9 251.2L539.0 255.3L533.8 259.0L532.6 262.8L535.9 264.6L535.3 268.7L529.1 278.3L524.4 291.8L519.9 289.6L517.5 290.1L516.5 288.4L511.6 289.8L509.8 287.0L508.1 286.8L510.2 295.2L508.6 302.3L509.2 306.9L507.4 309.6L504.1 308.8L504.9 311.6L503.5 313.9L503.7 319.8L505.3 321.9L505.6 325.4L504.4 325.8L504.6 327.2L502.4 326.8L501.7 331.3L500.7 330.3L499.8 332.2L498.9 329.7L495.7 327.7L495.3 330.7L493.8 331.5L492.1 315.7L490.8 312.0L489.3 311.1L488.8 304.8L489.9 304.7L487.5 294.5L486.2 295.9L484.9 294.2L482.9 296.1L481.1 294.2L481.4 299.6L477.3 303.4L478.7 307.8L474.5 311.1L470.4 303.7L470.5 308.4L469.1 307.6L468.6 302.1L465.4 296.8L466.4 295.2L465.4 294.0L466.6 294.1L467.3 292.0L466.9 290.1L468.3 288.6L469.8 289.1L469.7 286.3L473.8 287.0L475.4 283.6L477.3 285.5L476.9 283.3L479.0 283.8L480.0 285.7L480.4 281.4L485.2 279.7L485.0 277.5L486.4 277.6L487.8 272.9L486.5 269.5L491.8 270.0L490.3 266.7L483.2 263.3L474.8 264.7L474.3 263.6L471.5 264.5L467.6 262.9L451.3 264.3L442.0 260.9L439.4 261.1L440.3 254.2L439.0 250.0L440.4 247.3L439.2 247.3L440.1 246.5L438.2 245.3L438.6 244.3L436.4 242.6L436.3 241.1L434.6 242.8L435.7 244.8L434.3 246.8L431.3 245.1L430.0 246.0L426.0 243.2L424.7 237.7L422.1 236.4L421.1 237.4L422.9 240.0L424.1 239.9L423.9 241.0L421.0 240.0L419.8 241.2L418.9 239.5L416.4 240.5L417.9 238.7L411.9 234.6L411.1 232.8L409.8 235.9L412.8 236.3L413.6 238.5L412.3 238.1L410.2 241.4L406.8 243.0L406.9 245.6L405.0 247.9L405.4 250.0L408.6 250.2L412.2 253.2L412.0 254.7L413.9 256.5L417.0 257.3L419.2 256.2L419.8 259.6L423.1 260.9L423.1 261.7L421.4 263.8L419.9 262.8L419.1 263.7L412.0 262.9L411.1 268.5L409.8 270.1L408.3 269.9L407.7 268.1L406.0 268.7L406.7 270.3L403.4 274.4L409.8 280.5L417.7 282.6L418.0 285.4L417.0 286.0L418.4 288.9L416.4 291.3L414.6 291.5L414.3 296.0L417.9 299.6L419.0 299.2L417.4 304.4L422.9 305.2L419.9 309.6L422.3 313.1L421.2 314.9L422.2 316.3L421.7 319.1L422.9 324.9L424.9 327.7L423.7 328.8L424.2 332.3L423.3 331.5L422.7 333.2L424.9 338.7L421.4 338.8L420.2 335.7L420.0 339.1L419.4 337.7L417.5 337.8L417.1 334.0L418.6 330.7L418.1 329.4L416.8 329.6L417.4 330.9L415.9 329.4L414.2 334.9L413.5 332.1L412.3 333.2L412.1 339.2L411.7 339.3L411.9 339.0L411.5 338.3L411.8 337.3L411.6 337.0L411.1 339.7L411.2 336.9L410.5 337.7L408.7 336.6L409.4 339.9L408.1 340.3L406.4 331.9L407.4 327.8L406.8 326.9L403.7 326.3L407.0 328.8L404.2 330.7L399.4 337.4L390.3 339.9L391.0 340.5L385.4 340.8L381.9 345.0L380.2 349.3L383.1 356.0L381.0 357.0L383.5 357.1L383.7 358.3L382.5 358.2L382.1 358.3L382.9 358.7L385.0 358.1L379.1 362.8L378.3 362.1L377.9 364.7L379.4 365.4L377.2 367.2L379.6 366.1L374.2 369.5L372.2 373.4L370.1 373.7L371.2 374.4L354.9 379.9L355.9 379.7L345.0 386.3L345.9 386.7L339.3 392.2L339.3 393.1L340.2 392.2L330.6 404.5L331.7 404.1L326.5 408.4L327.1 409.3L315.9 415.3L309.1 424.5L297.1 431.1L291.3 436.3L290.2 438.4L290.2 439.7L292.3 440.8L291.8 437.3L292.5 439.0L292.4 441.0L292.0 442.7L290.5 443.3L292.5 442.9L291.3 445.6L290.3 443.7L291.2 445.9L290.3 446.4L291.2 446.4L279.7 451.7L279.9 450.9L279.7 450.6L279.5 451.8L276.5 450.4L270.8 452.1L268.6 458.9L265.5 462.1L266.2 463.4L264.4 464.4L263.6 463.5L264.1 464.3L262.3 464.6L261.7 461.6L259.2 460.6L256.2 461.3L251.1 465.2L246.8 477.9L247.4 483.6L249.5 488.1L248.7 488.7L249.8 488.5L247.9 495.4L248.4 499.3L251.0 505.4L250.5 508.3L252.7 515.9L249.0 533.3L243.4 542.3L241.2 550.1L242.6 556.7L241.5 556.2L241.2 556.3L242.7 556.9L243.1 560.2L242.5 568.2L243.6 579.0L241.8 579.8L238.8 577.8L232.0 580.1L230.8 582.5L231.5 584.7L226.1 591.7L224.3 596.5L226.2 599.4L225.4 599.6L230.0 600.9L223.5 601.5L211.8 606.4L209.0 611.9L210.5 611.4L208.7 614.5L209.1 617.5L207.9 620.1L197.7 626.5L193.1 625.4L187.1 620.6L178.0 608.9L180.3 606.9L177.8 608.2L176.3 603.9L176.8 604.4L177.0 603.2L175.6 601.5L176.2 603.8L174.2 599.1L171.9 586.4L172.9 586.7L172.5 584.9L172.0 586.2L170.6 582.6L171.3 581.4L170.3 581.7L168.5 574.1L165.6 569.1L166.3 568.5L166.4 568.3L165.5 568.9L163.8 561.8L164.6 561.7L163.4 561.1L162.5 556.7L159.7 554.3L158.2 549.3L154.5 546.1L153.7 543.8L151.5 543.1L144.1 525.4L145.0 525.5L141.5 514.7L141.0 508.6L142.1 508.4L140.7 507.8L136.3 494.8L138.0 495.6L136.2 494.7L135.4 489.3L134.0 489.7L133.6 488.1L134.7 487.9L133.1 487.5L133.5 485.6L130.2 484.4L131.1 482.5L130.1 482.9L128.9 479.8L126.2 477.7L127.0 476.6L127.0 476.2L125.9 472.5L123.6 470.8L125.6 470.4L123.7 469.8L124.4 468.8L123.3 469.1L122.6 467.0L123.7 465.7L122.6 466.5L120.6 461.0L117.2 457.2L115.8 451.2L116.6 450.4L115.6 450.7L115.4 450.2L117.4 449.5L115.5 449.9L114.4 447.5L114.8 446.4L115.4 447.4L115.1 447.4L115.1 447.7L115.3 448.1L116.9 447.7L114.5 445.6L116.1 445.2L114.7 445.2L114.2 442.8L115.0 440.7L114.0 441.0L113.8 438.1L114.0 437.5L114.2 438.0L114.7 438.2L114.7 437.8L114.4 437.9L114.4 437.6L113.5 437.4L113.3 436.1L113.9 437.1L114.6 436.2L112.0 430.8L113.3 431.6L114.1 430.9L111.6 428.6L112.4 427.9L110.9 425.2L112.5 424.6L110.9 424.1L109.9 419.4L110.7 419.4L109.3 417.9L110.0 417.1L108.8 416.9L110.0 416.1L108.6 416.0L108.0 411.8L106.9 411.2L107.5 409.9L110.2 412.8L109.4 411.8L109.8 410.9L109.1 409.6L109.8 409.5L109.9 409.1L109.1 409.4L108.8 410.3L106.6 408.5L106.4 404.4L108.3 406.0L105.4 401.1L105.6 398.9L107.0 398.3L108.1 399.3L107.8 399.9L108.2 400.5L108.5 400.7L108.0 397.5L106.4 396.8L109.5 394.2L108.2 394.5L107.9 390.6L107.4 393.8L105.6 394.5L105.2 396.2L104.4 396.9L104.9 390.8L103.9 391.4L105.1 389.2L103.9 390.6L104.0 388.2L106.5 388.5L103.8 387.2L103.2 384.9L106.0 383.5L102.9 383.4L101.4 377.0L101.6 374.8L103.2 374.7L102.5 371.9L103.9 368.9L103.4 367.3L106.2 362.2L105.1 357.6L105.8 357.8L106.8 357.3L104.8 356.6L103.9 353.9L105.2 352.8L103.4 353.7L103.0 352.2L102.9 351.1L105.2 351.5L104.2 351.1L104.8 350.3L102.4 350.3L104.0 348.4L101.9 348.9L101.1 350.5L101.1 347.8L101.6 347.4L102.2 348.1L103.1 348.0L100.3 345.9L102.0 344.7L101.2 344.0L102.3 342.4L103.1 343.0L103.5 342.7L102.8 342.1L101.2 342.7L101.9 341.6L104.9 338.1L106.8 337.9L99.1 338.1L100.7 333.0L101.3 332.1L102.6 332.3L103.1 332.0L103.3 331.6L101.3 331.7L99.1 333.2L98.5 331.5L100.0 326.6L103.5 327.3L104.6 325.5L106.5 325.4L105.0 325.0L103.2 326.1L99.0 324.5L97.0 326.6L96.0 323.8L94.9 324.4L94.4 328.8L92.1 330.5L93.4 332.6L93.1 332.2L92.7 332.0L91.7 331.8L93.4 332.9L93.4 335.0L92.8 334.0L91.8 335.0L94.5 338.9L93.2 342.6L90.3 345.5L90.7 348.0L79.0 353.1L77.6 355.0L65.4 358.8L52.2 351.0L37.3 334.1L34.6 332.8L28.2 324.5L30.9 320.8L30.2 322.7L33.3 322.1L32.6 324.4L34.0 325.6L39.0 323.9L39.5 322.0L40.8 324.2L41.7 323.2L42.6 324.1L43.8 320.9L45.4 322.5L45.9 321.4L47.6 321.7L48.9 319.4L52.6 319.5L58.0 310.4L54.8 310.9L53.5 308.6L53.6 310.8L51.8 309.9L51.1 311.7L47.2 312.5L47.1 311.6L46.9 311.6L43.8 313.6L43.5 315.3L38.4 314.5L36.4 313.6L36.8 312.8L36.6 312.3L36.4 313.6L33.9 312.4L33.4 313.2L31.0 310.8L30.8 311.6L29.8 310.1L29.3 310.8L29.2 309.9L28.8 310.5L24.7 308.1L22.3 306.2L23.9 307.1L21.2 304.9L23.2 303.4L21.2 302.4L19.9 299.3L18.7 299.6L19.1 298.1L18.2 299.0L20.6 294.6L25.8 291.1L22.8 291.5L19.9 294.0L18.4 294.1L18.7 293.2L18.2 292.4L16.7 297.4L15.1 298.0L15.5 297.1L15.2 296.5L14.8 297.7L13.2 296.7L16.7 294.3L15.0 294.1L14.7 295.5L13.6 294.4L13.9 292.1L16.9 289.1L24.6 289.2L25.7 281.9L26.9 284.0L28.4 282.1L29.6 283.8L31.4 282.7L33.3 283.5L41.2 282.3L43.9 284.9L49.7 284.9L51.3 282.3L60.2 279.6L61.0 279.9L60.4 283.2L63.2 284.0L67.0 283.0L66.4 282.3L67.8 281.2L71.2 280.0L68.8 279.1L68.6 275.9L70.7 273.9L67.6 268.6L66.7 264.2L62.3 258.9L62.2 252.4L54.5 252.2L51.1 247.4L52.6 234.4L45.7 233.6L39.5 230.3L39.6 224.7L41.1 221.0L49.7 213.0L51.8 207.8L56.5 203.4L60.8 203.5L63.7 209.2L66.3 209.9L72.9 207.2L82.0 206.3L86.5 204.5L87.1 201.1L92.6 195.3L96.2 187.4L107.1 181.9L113.7 170.3L116.0 162.4L124.1 159.8L127.3 157.0L125.5 153.6L127.4 151.8L126.4 151.9L126.6 150.9L129.3 150.2L136.1 141.3L141.6 138.5L141.4 137.3L139.1 138.3L137.9 137.2L138.7 132.3L140.7 131.0L137.4 124.9L139.8 121.1L144.0 119.7L145.2 117.7L152.3 116.9L154.9 114.0L153.9 111.5L150.2 110.1L149.5 108.7L141.3 108.4L140.4 105.8L141.5 104.8L140.7 103.3L141.7 101.0L140.4 102.9L135.2 102.5L126.4 96.9L124.3 97.4L120.7 95.6L121.4 93.1L119.5 89.6L120.7 86.4L119.4 84.2L119.9 78.7L118.1 76.0L117.8 70.5L116.0 68.4L117.1 64.3L121.1 64.4L122.5 60.2L128.8 57.5L130.5 52.6L122.9 50.5L121.8 47.8L123.8 45.6L123.7 44.0L116.2 43.9L114.7 41.1L110.7 39.9L112.1 38.5L111.7 36.9L99.7 37.1L98.6 36.0L99.7 33.7L98.8 32.3L99.3 29.0L107.6 23.8L109.7 21.0L109.4 19.2L115.6 17.9L125.1 18.6L121.4 14.4L128.7 16.2L136.2 12.6L138.9 13.3L139.1 11.9L141.4 10.7L142.3 11.9L144.4 11.3L145.6 14.0L150.4 12.0L155.8 13.6L156.6 18.5L158.2 17.4L162.0 18.0L166.1 21.1L167.8 24.6L181.4 30.6L183.7 36.9L188.6 39.5L193.7 39.9L196.1 41.3L197.2 44.9ZM497.2 601.4L498.1 602.3L498.3 603.9L497.8 604.3L496.5 604.3L496.2 603.8L496.1 602.3L497.0 602.3L497.2 601.4ZM492.8 567.2L492.9 566.9L493.5 567.5L493.7 568.8L493.1 568.7L494.2 569.4L494.2 571.4L492.7 573.0L493.3 573.5L492.3 574.8L491.5 574.7L490.6 574.0L489.6 574.4L490.2 572.2L489.6 571.6L489.5 568.8L489.8 568.6L490.0 568.9L491.9 566.7L492.1 567.2L492.2 566.7L492.6 566.6L492.8 567.2ZM495.2 554.0L495.6 555.4L494.8 555.8L495.7 556.2L495.7 556.6L494.0 557.2L493.5 556.6L493.7 555.9L494.4 555.9L494.2 554.0L494.6 553.5L495.2 554.0ZM486.1 552.0L487.5 552.2L487.6 553.1L487.4 553.5L486.3 553.0L486.1 552.0ZM496.1 538.5L495.9 539.7L496.6 539.3L497.0 539.5L496.5 541.1L496.7 542.0L496.5 541.9L496.3 542.1L496.0 542.1L496.4 542.2L496.7 542.1L496.7 541.8L497.2 542.2L497.7 542.1L497.1 542.7L496.9 542.5L496.6 542.5L497.2 543.2L496.8 543.3L497.0 543.6L496.4 543.6L496.6 543.9L496.2 544.0L496.4 544.2L496.2 544.8L496.4 544.7L496.5 545.4L496.8 544.6L497.5 544.5L497.7 545.4L497.0 549.6L496.7 549.4L496.7 549.9L495.9 549.5L495.7 549.7L496.0 549.7L496.1 550.2L495.2 550.6L495.3 551.2L495.5 551.0L495.8 551.3L495.8 550.7L496.2 550.8L496.5 550.5L496.3 550.0L497.0 550.4L497.0 550.8L496.5 551.0L496.9 550.9L497.0 551.5L496.1 554.3L495.9 553.8L494.9 553.4L494.9 552.4L494.6 552.2L494.3 552.5L494.1 551.3L494.6 551.4L494.7 551.0L494.0 550.9L493.8 550.2L493.9 549.3L493.4 549.3L493.2 549.7L492.8 547.1L493.0 546.7L492.9 546.5L492.5 546.9L492.2 546.5L492.6 545.1L493.2 544.4L493.6 544.9L493.6 545.6L493.8 545.3L494.0 545.4L494.1 546.4L494.3 541.0L495.1 538.7L495.3 539.5L495.3 538.8L495.5 538.4L495.6 538.7L495.8 538.1L496.1 538.5ZM497.3 536.6L499.2 536.8L499.6 537.1L499.6 537.7L499.1 538.1L499.5 539.1L498.7 539.0L499.0 539.7L498.2 539.8L498.4 540.0L497.9 540.5L498.1 540.9L497.5 541.1L497.9 541.3L497.2 541.9L496.6 541.2L497.4 538.1L497.1 538.3L496.7 537.9L496.9 537.5L497.2 537.7L497.4 537.3L497.3 536.6ZM499.8 523.6L500.3 523.9L500.0 524.4L500.4 524.4L500.9 526.0L500.5 526.8L500.8 526.9L501.5 528.1L501.2 528.3L501.0 530.0L500.8 530.0L500.6 530.1L501.0 530.2L501.4 531.8L501.2 532.8L501.0 533.0L500.8 532.7L500.3 533.3L501.1 533.2L500.3 533.9L500.1 534.6L499.6 533.8L499.9 533.6L499.9 533.5L499.5 533.8L498.7 533.2L499.8 534.3L499.4 534.5L497.9 533.9L498.0 533.6L497.9 533.5L497.9 534.0L498.5 534.2L499.0 535.5L499.7 535.8L499.7 536.0L499.2 536.1L499.6 536.4L498.4 536.7L497.3 536.5L497.1 536.9L496.7 536.9L495.9 536.2L496.1 532.7L495.8 532.2L496.0 530.5L495.6 530.2L496.1 530.1L496.2 529.5L496.4 529.9L496.9 529.0L497.4 529.0L497.5 529.7L497.6 528.3L497.3 528.9L496.6 529.0L496.8 527.8L496.3 525.7L496.6 525.5L496.7 526.0L496.9 525.3L497.5 525.7L497.8 524.3L498.8 524.2L499.1 524.6L499.7 524.2L499.8 523.6ZM496.2 522.6L496.3 524.8L495.4 525.7L495.7 526.0L495.3 526.6L494.9 525.0L495.3 524.5L495.4 523.2L495.2 522.9L495.7 522.1L496.2 522.6ZM418.4 338.3L418.8 339.8L418.2 339.9L418.1 339.6L417.7 340.0L417.4 339.8L417.5 338.6L416.8 337.7L417.0 337.1L417.1 337.7L417.8 338.3L418.4 338.3ZM416.4 332.8L415.9 333.7L416.1 333.8L415.9 335.5L415.6 335.5L415.3 334.9L415.5 334.6L415.0 334.0L415.5 333.2L415.6 333.4L415.8 332.7L416.4 332.8ZM416.2 330.6L417.3 331.0L416.8 331.5L416.9 331.7L416.6 332.2L415.7 332.0L415.9 330.9L416.2 330.6ZM518.6 644.2L518.5 644.7L519.2 644.9L519.3 647.4L519.7 647.7L519.9 648.7L520.6 649.2L520.4 649.4L520.1 649.0L519.9 649.3L520.5 650.1L519.9 650.5L519.8 651.2L519.5 651.3L519.5 652.5L519.8 652.7L519.6 653.3L519.2 653.6L518.7 653.2L518.2 654.5L517.8 654.3L517.9 653.1L517.4 652.7L517.6 652.4L517.2 651.8L517.4 651.7L516.9 650.9L516.6 651.2L516.0 649.3L515.4 648.8L514.8 648.9L514.7 647.0L514.9 646.8L514.6 646.5L515.1 645.9L515.2 645.3L516.1 645.2L516.6 644.7L517.6 644.9L517.6 644.2L518.6 644.2ZM516.2 640.7L516.8 641.1L516.9 641.5L516.2 642.7L515.5 643.0L514.7 644.0L514.2 642.7L514.5 642.4L514.4 641.3L515.9 641.0L515.8 639.8L516.2 640.7ZM509.6 627.9L509.5 628.7L510.0 628.8L510.6 629.6L510.8 630.5L510.6 630.8L510.0 630.1L509.0 630.6L508.4 630.5L508.4 629.7L508.7 629.4L507.9 629.6L507.7 629.0L508.0 628.0L509.0 627.6L509.6 627.9ZM513.1 627.7L513.4 628.7L513.2 629.6L511.8 628.2L512.3 627.5L512.7 628.1L512.6 627.5L513.1 627.7ZM512.6 623.3L512.5 624.2L512.0 624.3L511.6 624.8L512.6 626.1L512.7 627.2L512.3 627.0L511.9 627.4L511.9 628.0L511.6 628.1L511.4 627.1L511.9 627.2L511.9 626.6L512.0 627.0L512.4 626.6L512.0 626.2L511.4 626.9L511.3 626.2L511.5 626.1L511.0 625.6L510.8 624.2L511.8 623.1L512.6 623.3ZM504.6 620.7L504.3 622.2L505.8 623.4L505.6 623.9L504.0 623.2L503.5 622.2L503.7 620.7L504.6 620.7ZM501.1 542.1L501.8 542.6L502.6 544.4L502.8 545.4L502.6 545.7L501.7 544.6L501.8 544.3L502.3 544.6L501.8 544.2L502.0 544.1L501.8 543.7L502.0 544.1L501.8 544.2L501.7 543.9L501.5 543.8L501.7 544.2L501.4 544.4L500.9 543.6L500.3 543.3L501.1 542.1ZM503.5 539.1L503.6 541.0L503.2 541.4L502.5 540.2L503.1 538.7L503.5 539.1ZM502.4 509.7L502.6 511.8L502.2 512.2L502.5 512.8L501.9 512.9L502.4 513.0L502.7 513.4L503.0 513.2L503.0 513.6L503.2 513.5L502.8 514.0L503.5 515.0L503.0 515.5L503.0 515.1L502.6 515.2L502.7 514.5L501.9 514.6L501.6 515.1L501.1 514.3L500.9 514.7L501.8 515.4L501.6 515.8L502.0 515.2L502.0 516.1L502.7 516.1L502.7 516.5L503.1 516.4L502.5 518.0L502.5 520.7L501.9 521.4L501.2 521.3L501.3 521.7L501.0 521.8L500.5 521.2L500.6 519.9L500.5 520.9L499.6 520.1L500.1 520.7L499.4 521.1L500.1 521.1L500.0 522.0L500.6 522.6L500.0 523.1L499.8 522.1L499.4 523.3L499.0 523.3L499.1 523.9L499.3 524.0L499.2 524.5L497.9 524.1L497.7 522.5L497.9 522.2L498.2 522.3L498.4 521.7L497.6 521.7L497.8 521.3L497.7 520.1L497.9 520.4L498.1 520.4L498.0 520.0L498.2 520.0L498.4 519.6L498.0 519.3L498.4 519.1L498.7 519.4L498.8 519.1L498.0 518.7L498.1 518.3L498.5 518.4L498.2 518.2L498.4 517.0L498.9 516.9L498.9 516.6L498.3 516.3L498.7 515.6L498.3 515.4L498.6 514.0L498.9 514.3L499.4 513.8L499.0 513.8L498.7 513.5L499.4 513.4L499.2 513.1L499.5 512.8L499.3 512.0L499.8 511.8L499.9 511.4L500.4 511.5L500.0 511.2L500.5 510.9L500.2 510.9L500.2 510.7L501.2 510.5L501.6 510.7L501.6 509.9L502.1 510.5L502.4 509.7Z",lon0:67.5,lat1:37.6,k:0.9271838545667874,sx:21.21707690513279};
const inP=(lat,lng)=>[(lng-INDIA.lon0)*INDIA.k*INDIA.sx,(INDIA.lat1-lat)*INDIA.sx];
function chapterStats(c){
  const t=todayISO(),mem=[...S.members.entries()].filter(([,m])=>m.chapter===c.name),ids=new Set(mem.map(x=>x[0]));
  const ev=S.events.filter(e=>e.chapter===c.name),up=ev.filter(e=>e.date>=t).sort((a,b)=>a.date.localeCompare(b.date)),past=ev.filter(e=>e.date<t).sort((a,b)=>b.date.localeCompare(a.date));
  const stories=S.stories.filter(s=>ids.has(s.authorId)&&s.status!=="rejected").length,arch=S.archive.filter(a=>ids.has(a.authorId)).length;
  const photos=allMedia().filter(m=>ev.some(e=>e.id===m.eid)&&/^image\//.test(m.type||"")).slice(0,4);
  return {n:mem.length,up,past,stories,arch,photos,active:!!(c.active||mem.length||ev.length)};
}
function indiaMap(chs){
  const pins=chs.filter(c=>c.lat&&c.lng);
  return `<figure class="imap"><svg viewBox="0 0 ${INDIA.W} ${INDIA.H}" role="img" aria-label="Map of India showing chapter locations">
    <path d="${INDIA.d}" class="imap-land"/>
    ${pins.map(c=>{const [x,y]=inP(c.lat,c.lng),st=chapterStats(c);return `<a href="#chapters" data-act="jump" data-id="ch-${esc(c.id)}"><g class="ipin active" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="15" class="ipin-halo"/><circle r="7"/><text x="${c.lng>88?-16:16}" y="6" text-anchor="${c.lng>88?"end":"start"}">${esc(c.name)}</text></g></a>`}).join("")}
  </svg><figcaption>Chapter locations. Members abroad belong to the Overseas chapter. Boundary: DataMeet India composite map (CC BY 4.0).</figcaption></figure>`;
}
VIEWFN.chapters=()=>{
  const chs=[...S.chapters].sort((a,b)=>(a.order||99)-(b.order||99));
  const tot={n:0,ev:0,st:0};for(const c of chs){const s=chapterStats(c);tot.n+=s.n;tot.ev+=s.up.length+s.past.length;tot.st+=s.stories+s.arch}
  const card=c=>{const key="chapters/"+c.id,s=chapterStats(c),admin=S.isAdmin&&!S.offline;
    return `<article class="chcard" id="ch-${esc(c.id)}">
      <header><div><h3>${esc(c.name)}</h3><p class="chloc">${esc(c.location||"")}</p></div></header>
      ${S.edit===key?`<form id="chapterForm" data-id="${esc(c.id)}" class="inline"><label for="cp">Purpose <small>(one per line)</small></label><textarea id="cp" name="purpose" style="min-height:5rem">${esc((c.purpose||[]).join("\n"))}</textarea><label for="cco">Coordinator</label><select id="cco" name="coordinator">${kopts(Object.fromEntries([...S.priv.entries()].map(([id,m])=>[id,m.name])),c.coordinator,"None yet")}</select><div class="actions"><button class="btn small" type="submit">Save</button><button class="link" type="button" data-act="cancelEdit">Cancel</button></div></form>`:`
      <dl class="chfacts"><dt>Purpose</dt><dd><ul>${(c.purpose||[]).map(p=>`<li>${esc(p)}</li>`).join("")}</ul></dd>
      <dt>Coordinator</dt><dd>${c.coordinator?esc(nameOf(c.coordinator)):`<span class="meta">Being appointed</span>`}</dd></dl>`}
      <div class="chstats"><div><b>${s.n}</b><span>${s.n===1?"member":"members"}</span></div><div><b>${s.up.length+s.past.length}</b><span>events</span></div><div><b>${s.stories}</b><span>stories</span></div><div><b>${s.arch}</b><span>archive items</span></div></div>
      ${s.up.length||s.past.length?`<div class="chact"><h4>Activities</h4>
        ${s.up.length?`<p class="chlab">Upcoming</p><ul>${s.up.slice(0,3).map(e=>`<li><a href="#events">${esc(e.title)}</a> <span class="meta">${fmtDate(e.date)}${e.location?`, ${esc(e.location)}`:""}</span></li>`).join("")}</ul>`:""}
        ${s.past.length?`<p class="chlab">Recent</p><ul>${s.past.slice(0,2).map(e=>`<li><a href="#events">${esc(e.title)}</a> <span class="meta">${fmtDate(e.date)}</span></li>`).join("")}</ul>`:""}
        ${s.photos.length?`<div class="chphotos">${s.photos.map(m=>`<a href="#events"><img src="${esc(m.url||"/_blob/"+m.assetId)}" alt="${esc(m.caption||"Chapter activity")}" loading="lazy"></a>`).join("")}</div>`:""}</div>`:`<p class="chnone">Its programmes will be listed here as they are added to the Events page.</p>`}
      <div class="actions"><a href="#members" data-act="chmembers" data-id="${esc(c.name)}">See members</a>${admin?`<button class="link quiet" data-act="edit" data-id="${esc(key)}">Edit</button>`:""}</div>
    </article>`};
  return `<section class="llanding"><div class="llanding-inner chhead">
    <div><p class="eyebrow">SSRF Chapters</p><h2>Chapters across India and abroad</h2>
    <p>Each chapter has a defined research and outreach purpose, a coordinator and its own programmes, from oral-history collection to school outreach and seminars.</p>
    <p class="alanding-stats"><b>${chs.length}</b> chapters · <b>${tot.n}</b> members · <b>${tot.ev}</b> events · <b>${tot.st}</b> research contributions</p></div>
    ${indiaMap(chs)}
  </div></section>${accessNotice()}
  ${!isReady("chapters")?`<p class="empty">Loading…</p>`:`<div class="chgrid">${chs.map(card).join("")}</div>`}`;
};

/* ================= Learning ================= */
const LCAMPS=[
  {k:"early",yr:"1919–1949",lbl:"1919",t:"Desert boyhood to the Gorkha Rifles",pin:[28.02,73.31,"Bikaner"],facts:["Born on 14 July 1919 in Kusumdesar, Bikaner State","Enrolled as a Naik in the Bikaner Ganga Risala in 1938","Joined the 3rd Gorkha Rifles of the Indian Army in February 1949"],q:"How did a soldier from a princely state's army rise to command a corps?",go:["#life",""]},
  {k:"goa",yr:"1961",t:"The liberation of Goa",pin:[15.49,73.83,"Goa"],facts:["Commanded 50 Parachute Brigade in Operation Vijay","His battalions raced to Panjim on 18 and 19 December","2 Sikh Light Infantry were first into Panjim"],q:"Why did speed matter so much in Goa?",go:["#campaigns","goa"]},
  {k:"nathula",yr:"1965–1967",lbl:"1967",t:"Holding Nathu La",pin:[27.39,88.83,"Nathu La"],facts:["Commanded 17 Mountain Division in Sikkim","Refused in 1965 to vacate Nathu La","Held Nathu La and Cho La against Chinese attacks in 1967"],q:"What would have changed if the pass had been given up?",go:["#campaigns","nathula"]},
  {k:"1971",yr:"1971",t:"Across the Meghna to Dhaka",pin:[24.05,90.98,"Meghna"],facts:["Commanded IV Corps in the east","Moved troops across the Meghna by helicopter","Pakistan's eastern command surrendered in Dhaka on 16 December"],q:"How did helicopters change what was possible?",go:["#campaigns","meghna"]}];
function miniMap(pin,all){
  const [x,y]=inP(pin[0],pin[1]);
  return `<svg viewBox="0 0 ${INDIA.W} ${INDIA.H}" class="lmap" aria-hidden="true"><path d="${INDIA.d}" class="lmap-land"/>${(all||[]).map(p=>{const [a,b]=inP(p[0],p[1]);return `<circle cx="${a.toFixed(0)}" cy="${b.toFixed(0)}" r="9" class="lmap-dim"/>`}).join("")}<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="30" class="lmap-halo"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="14" class="lmap-pin"/></svg>`;
}
const TEACH={guide:"/_blob/3d8e36600bcf5d5ce2b32a89c2f3a130",slides:"/_blob/4dfe0cd956bd4c34940ea105c3f4614c"};
VIEWFN.learn=()=>{
  const lv=S.f.lvl||"school";
  const pins=LCAMPS.map(c=>c.pin);
  const qn=t=>Q.all.filter(q=>q.topic===t).length;
  return `<section class="lclanding"><div class="llanding-inner lchead">
    <div><p class="eyebrow">SSRF Learning Centre</p><h2>Learn the story of Lt Gen Sagat Singh</h2>
    <p>For students, teachers and anyone meeting his story for the first time: four campaigns, a quiz, classroom resources, and real historical evidence to read for yourself.</p>
    <div class="entry"><a class="btn" href="#learn" data-act="jump" data-id="quiz">Take the quiz</a><a class="btn ghost" href="#learn" data-act="jump" data-id="l-camps">Explore the campaigns</a><a class="btn ghost" href="#learn" data-act="jump" data-id="l-teach">For teachers</a></div></div>
    <figure class="lchmap">${(()=>{return `<svg viewBox="0 0 ${INDIA.W} ${INDIA.H}" aria-label="Map: Bikaner, Goa, Nathu La and the Meghna"><path d="${INDIA.d}" class="imap-land"/>${LCAMPS.map(c=>{const [x,y]=inP(c.pin[0],c.pin[1]);return `<g class="ipin active" transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><circle r="15" class="ipin-halo"/><circle r="7"/><text x="${c.pin[1]>86?-16:16}" y="6" text-anchor="${c.pin[1]>86?"end":"start"}">${esc(c.pin[2])} ${esc(c.lbl||c.yr.split("–")[0])}</text></g>`}).join("")}</svg>`})()}<figcaption>Where his story happened. Boundary: DataMeet India composite map (CC BY 4.0).</figcaption></figure>
  </div></section>
  <h2 class="sect" id="l-camps">His story in four chapters</h2>
  <div class="lcgrid">${LCAMPS.map((c,i)=>`<article class="lccard"><div class="lccard-map">${miniMap(c.pin,pins)}<span class="lcyr">${esc(c.yr)}</span><span class="lcnum">${i+1}</span></div>
    <div class="lccard-body"><h3>${esc(c.t)}</h3><ul>${c.facts.map(f=>`<li>${esc(f)}</li>`).join("")}</ul><p class="lcq"><b>Think about it:</b> ${esc(c.q)}</p>
    <div class="actions"><a href="${c.go[0]}"${c.go[1]?` data-act="camp" data-id="${c.go[1]}"`:""}>Read the full ${c.go[1]?"campaign":"biography"} ›</a>${qn(c.k)?`<button class="link" data-act="lquiz" data-id="topic:${c.k}">Quiz: ${qn(c.k)} questions</button>`:""}</div></div></article>`).join("")}</div>

  <h2 class="sect" id="l-evidence">Learn through historical evidence</h2>
  <p class="prose">Historians build the story from evidence. Each card below shows one piece, says what kind of evidence it is, and asks you a question about it.</p>
  <div class="evgrid">
    <article class="evcard doc"><p class="evkind"><span class="snat" style="--nc:${NATCOL["Secondary research"]}">Document extract</span> Official history, 1974</p>
      <blockquote>"It will be remembered that two battalions from the 50th Para Brigade were engaged on the 18th in a race for Panjim. ... So the 2 Sikh Light Infantry won the race and were first in Panjim."</blockquote>
      <p class="evsrc">P N Khera, <i>Operation Vijay</i>, Historical Section, Ministry of Defence, 1974, pp. 82–83. <a href="https://archive.org/stream/in.ernet.dli.2015.65754/2015.65754.Operation-Vijay-The-Liberation-Of-Goa-And-Other-Portuguese-Colonies-In-India_djvu.txt" target="_blank" rel="noopener">Read the full text ↗</a></p>
      <p class="evq"><b>Ask:</b> The writer was not in Goa. How could he know this? What records might he have used?</p></article>
    <article class="evcard map"><p class="evkind"><span class="snat" style="--nc:#3d5a80">Map</span> The Meghna crossing, 1971</p>
      <div class="evmap">${meghnaMap()}</div>
      <p class="evq"><b>Ask:</b> The bridge at Bhairab Bazar was destroyed. Trace on the map how the helicopters solved the problem.</p></article>
    <article class="evcard rec"><p class="evkind"><span class="snat" style="--nc:${NATCOL["Primary source"]}">Official record</span> Raj Bhavan, Sikkim, 11 September 2025</p>
      <blockquote>The Governor unveiled a statue of Lt Gen Sagat Singh, who "led the Indian Army during the confrontation, displaying exceptional courage, leadership, and strategic acumen."</blockquote>
      <p class="evsrc">Release of Raj Bhavan, Sikkim, on the 59th Nathula Vijay Diwas. <a href="https://rajbhavansikkim.gov.in/?p=17216" target="_blank" rel="noopener">Read the release ↗</a></p>
      <p class="evq"><b>Ask:</b> This was written 58 years after the events. Is it evidence of what happened in 1967, or of how he is remembered today?</p></article>
    <article class="evcard photo"><p class="evkind"><span class="snat" style="--nc:${NATCOL["Primary source"]}">Photographs</span> From the digital archive</p>
      <p>Photographs from his campaigns and family life are being catalogued in the foundation's archive. Each one will carry its date, origin and credit, so students can ask who took it, when and why.</p>
      <p class="evq"><b>Ask:</b> What can a photograph tell you that a written record cannot? What can it hide?</p>
      <div class="actions"><a href="#archive">Open the digital archive ›</a></div></article>
  </div>

  <h2 class="sect" id="quiz-h">Quiz</h2>
  <section class="quiz qpolish" id="quiz" aria-live="polite"></section>

  <h2 class="sect">Learning material</h2>
  <div class="lvtabs" role="tablist"><button role="tab" aria-selected="${lv==="school"}" class="lvtab${lv==="school"?" on":""}" data-act="lvl" data-id="school"><b>For schools</b><span>Classes 6 to 10</span></button><button role="tab" aria-selected="${lv==="adv"}" class="lvtab${lv==="adv"?" on":""}" data-act="lvl" data-id="adv"><b>Advanced study</b><span>Classes 11 to 12, college and researchers</span></button></div>
  <div class="lvpanel">${lv==="school"?`
    <h3>His life, told simply</h3>
    <p class="prose">Sagat Singh was born in a village in the Rajasthan desert in 1919. He joined the army of Bikaner State as a young man and fought in the Second World War. After Independence he became an officer of the Indian Army and joined the Gorkha Rifles.</p>
    <p class="prose">In 1961 he led paratroopers into Goa, which had been ruled by Portugal for 451 years. In 1967, in the mountains of Sikkim, his division held the pass of Nathu La when Chinese troops attacked. In 1971 he took his corps across the wide Meghna river by helicopter and helped end the war that created Bangladesh. He died in 2001.</p>
    <h3>Talk about it</h3>
    <ul class="prose"><li>Why do you think he was trusted with paratroopers in 1961?</li><li>What might have happened at Nathu La if the pass had been given up?</li><li>How did helicopters help his soldiers cross the Meghna?</li></ul>
    <h3>Activities</h3>
    <ul class="prose"><li>On a blank map of India and Bangladesh, mark Bikaner, Goa, Nathu La and the Meghna river.</li><li>Write a short diary entry by a soldier in 2 Sikh Light Infantry on the day they reached Panjim.</li><li>Find out whether your town has a memorial to a soldier from 1961, 1967 or 1971.</li></ul>`:`
    <h3>Questions on leadership</h3>
    <ul class="prose"><li>A commander should sometimes act beyond his orders. Agree or disagree, using the Meghna crossing. The famous telephone exchange with his superior is an unconfirmed account; build your argument without it.</li><li>Holding Nathu La in 1965 was worth the risk of a wider conflict. Discuss.</li><li>Why was a parachute brigade given to an infantry officer in 1961, and what did that choice achieve?</li></ul>
    <h3>Research assignments</h3>
    <ul class="prose"><li>Choose an entry on the Biography or Campaign pages marked "Single source". Find a second source that confirms or corrects it, and send it through "Suggest a correction".</li><li>Compare the official history of Operation Vijay (1974) with the biography <i>A Talent for War</i> (2013) on the race to Panjim. Where do they agree?</li><li>Compare two videos about the Meghna crossing in the Videos section. Where do they differ from the campaign page, and which is better supported?</li><li>Find a memorial, road or institution named after a soldier from 1961, 1967 or 1971, and document it for the Recognition register.</li></ul>
    <h3>Working with sources</h3>
    <p class="prose">The <a href="#sources">Sources</a> page classifies every source as primary, oral history, family testimony, secondary research or tertiary. Use these categories in your own bibliography, and say for each claim what kind of evidence supports it.</p>`}</div>

  <h2 class="sect" id="l-teach">For teachers</h2>
  <div class="tgrid">
    <a class="tcard" href="${TEACH.guide}" target="_blank" rel="noopener" download="ssrf-teachers-guide.pdf"><span class="tic">PDF</span><b>Teacher's guide</b><span>A 45-minute lesson plan, learning objectives, timeline, discussion questions for two age groups and further reading. 3 pages.</span><em>Download ↓</em></a>
    <a class="tcard" href="${TEACH.slides}" target="_blank" rel="noopener" download="ssrf-classroom-slides.pdf"><span class="tic">PDF</span><b>Classroom slides</b><span>Ten slides for a classroom screen: his life, the three campaigns, a source to read together and a class activity.</span><em>Download ↓</em></a>
    <div class="tcard plain"><span class="tic">Q</span><b>Teacher mode in the quiz</b><span>One question at a time on the classroom screen, no scoring, answers revealed when you choose. Tick "Teacher mode" before starting the quiz.</span></div>
  </div>
  <p class="meta">Students under 18 should not create their own accounts; school use runs through a teacher's account. The resources are free to copy for classroom use.</p>
  ${S.isAdmin&&!S.offline?`<p class="meta" style="margin-top:2rem"><button class="link" data-act="researchMode">${S.research?"Hide research notes (show the public view)":"Show research notes and the question bank (editors only)"}</button></p>`:""}${S.isAdmin&&!S.offline&&S.research?quizManager():""}`;
};

/* ================= Events ================= */
VIEWFN.events=()=>{
  const t=todayISO(),f=S.f,ev=S.events.filter(e=>(!f.etype||e.type===f.etype)&&(!f.chapter||e.chapter===f.chapter));
  const up=ev.filter(e=>e.date>=t).sort((a,b)=>a.date.localeCompare(b.date)),past=ev.filter(e=>e.date<t).sort((a,b)=>b.date.localeCompare(a.date));
  return `<h2>Events and programmes</h2>
  <p class="sub">Commemorations, research events and public programmes. When its date passes, an event moves to past events, where its report, proceedings, photographs, credits and press coverage become the permanent record.</p>
  ${accessNotice()}${myPendingPanel("event")}
  <div class="bar"><select data-f="etype" aria-label="Type">${opts(ETYPES,f.etype,"All types")}</select><select data-f="chapter" aria-label="Chapter">${opts(chapterNames(),f.chapter,"All chapters")}</select><span class="grow"></span>${contributeBtn("form","event",S.isAdmin?"Add an event":"Propose an event")}</div>
  ${S.form==="event"?(canPost()&&me()?eventForm({}):needJoin("propose an event")):""}
  ${S.uploading?`<div class="notice">Uploading ${S.uploading} ${S.uploading===1?"file":"files"}… keep this page open.</div>`:""}
  <h3 class="sect">Upcoming</h3>${!isReady("events")?`<p class="empty">Loading…</p>`:up.length?up.map(e=>eventCard(e,false)).join(""):`<p class="empty">No upcoming events.</p>`}
  <h3 class="sect">Past events</h3>${past.length?past.map(e=>eventCard(e,true)).join(""):`<p class="empty">No past events recorded.</p>`}`;
};
function eventCard(e,isPast){
  const amGoing=(S.attend.get(S.uid)||[]).includes(e.id),going=[...S.attend.values()].filter(a=>a.includes(e.id)).length;
  const media=allMedia().filter(m=>m.eid===e.id).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));
  const pics=media.filter(m=>m.kind!=="link"),links=media.filter(m=>m.kind==="link"),open=S.open.has(e.id),shown=open?pics:pics.slice(0,6);
  const canAdd=canPost()&&me(),key="events/"+e.id+"#report";
  return `<article class="story">
    <div class="when">${esc(fmtDay(e.date))}</div>
    <div>${e.type?`<span class="tag">${esc(e.type)}</span>`:""}${e.chapter?`<span class="tag">${esc(e.chapter)} chapter</span>`:""}${(e.camps||[]).map(c=>`<span class="tag">${esc(campName(c))}</span>`).join("")}${e.time?` <span class="meta">${esc(e.time)}</span>`:""}</div>
    <h3>${esc(e.title)}</h3>
    <div class="meta">${esc([e.location,e.organiser?`Organised by ${e.organiser}`:"",e.coordinator?`Coordinator: ${e.coordinator}`:""].filter(Boolean).join(". "))}</div>
    ${e.description?`<p class="body">${esc(e.description)}</p>`:""}
    ${e.speakers?`<p class="meta"><b>Speakers:</b> ${esc(e.speakers)}</p>`:""}${e.programme?`<p class="meta"><b>Programme:</b> ${esc(e.programme)}</p>`:""}
    ${isPast?(S.edit===key?`<form class="panel inline" id="reportForm" data-id="${e.id}">
        <label for="sm">Event report</label><textarea id="sm" name="summary" maxlength="8000">${esc(e.summary)}</textarea>
        <label for="spr">Proceedings <small>(papers presented, key points)</small></label><textarea id="spr" name="proceedings" maxlength="8000" style="min-height:4rem">${esc(e.proceedings)}</textarea>
        <div class="grid2"><div><label for="sat">Attendance</label><input id="sat" name="attendance" maxlength="40" value="${esc(e.attendance)}"></div><div><label for="srec">Recording link</label><input id="srec" name="recording" type="url" value="${esc(e.recording)}" placeholder="https://"></div></div>
        <label for="so">Outcomes and follow-up</label><input id="so" name="outcomes" maxlength="1000" value="${esc(e.outcomes)}">
        <label for="sr">Press coverage links <small>(one per line)</small></label><textarea id="sr" name="press" maxlength="2000" style="min-height:3.5rem">${esc(e.press)}</textarea>
        <div class="actions"><button class="btn small" type="submit">Save report</button><button class="link" type="button" data-act="cancelEdit">Cancel</button></div></form>`:
      (e.summary||e.proceedings?`<div class="panel" style="margin:.8rem 0">${e.summary?`<b>Report</b><p class="body">${esc(e.summary)}</p>`:""}${e.proceedings?`<b>Proceedings</b><p class="body">${esc(e.proceedings)}</p>`:""}${e.attendance?`<p class="meta"><b>Attendance:</b> ${esc(e.attendance)}</p>`:""}${e.outcomes?`<p class="meta"><b>Outcomes:</b> ${esc(e.outcomes)}</p>`:""}${e.recording?`<p class="meta"><a href="${esc(e.recording)}" target="_blank" rel="noopener">Watch the recording</a></p>`:""}</div>`:"")):""}
    ${e.press?`<p class="meta"><b>Press:</b> ${lines(e.press).filter(u=>/^https:\/\//i.test(u)).map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener">Report ${i+1}</a>`).join(" · ")}</p>`:""}
    ${isPast&&shown.length?`<div class="gallery">${shown.map(m=>`<figure>${m.kind==="video"?`<video src="${esc(m.url||"/_blob/"+m.assetId)}" controls preload="metadata"></video>`:`<a href="${esc(m.url||"/_blob/"+m.assetId)}" target="_blank" rel="noopener"><img src="${esc(m.url||"/_blob/"+m.assetId)}" alt="${esc(m.caption||"Photo from "+e.title)}" loading="lazy"></a>`}<figcaption>${esc(m.caption||"")}${m.credit?` <span>Credit: ${esc(m.credit)}</span>`:""}</figcaption>${m.owner===S.uid||S.isAdmin?`<button class="rm" data-act="delMedia" data-id="${m.id}" data-owner="${m.owner}" aria-label="Remove">×</button>`:""}</figure>`).join("")}</div>`:""}
    ${isPast&&pics.length>6?`<button class="link" data-act="toggle" data-id="${e.id}">${open?"Show fewer":`Show all ${pics.length} photos and videos`}</button>`:""}
    ${isPast&&links.length?`<div class="meta">${links.map(m=>`<div><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.caption||"Watch the video")}</a>${m.credit?` · ${esc(m.credit)}`:""}${m.owner===S.uid||S.isAdmin?` <button class="link" data-act="delMedia" data-id="${m.id}" data-owner="${m.owner}">Remove</button>`:""}</div>`).join("")}</div>`:""}
    <div class="actions">${e.link?`<a href="${esc(e.link)}" target="_blank" rel="noopener">More details</a>`:""}
      ${!isPast?`<button class="btn small ${amGoing?"ghost":""}" data-act="attend" data-id="${e.id}" ${canAdd?"":"disabled"}>${amGoing?"Cancel registration":"Register to attend"}</button><span class="meta">${going?`${going} registered`:""}</span>`:""}
      ${isPast&&S.isAdmin&&S.edit!==key?`<button class="link" data-act="edit" data-id="${esc(key)}">${e.summary?"Edit report":"Write the report"}</button>`:""}
      ${correctionLink("events/"+e.id,e.title)}${S.isAdmin?`<button class="link" data-act="del" data-col="events" data-id="${e.id}">Delete event</button>`:""}</div>
    ${isPast&&canAdd?`<form class="inline-form media-form" id="mediaForm" data-id="${e.id}"><input name="caption" maxlength="200" placeholder="Caption: who, what, where" aria-label="Caption"><input name="credit" maxlength="120" placeholder="Photographer or source" aria-label="Credit"><input name="url" type="url" placeholder="Or a YouTube link (https://)" aria-label="Video link"><span class="actions" style="margin:0">${S.assets?`<label class="btn small ghost upl">Upload photos or videos<input type="file" accept="image/*,video/*" multiple data-upload="${e.id}"></label>`:""}<button class="btn small ghost" type="submit">Add link</button></span></form>`:""}
  </article>`;
}
function eventForm(v){
  return `<form class="panel" id="eventForm"${S.resub?` data-resub="${esc(S.resub)}"`:""}>
    <label for="et">Event name</label><input id="et" name="title" required maxlength="160" value="${esc(v.title)}">
    <div class="grid2">
      <div><label for="ey">Type</label><select id="ey" name="type">${opts(ETYPES,v.type||"Commemorative")}</select></div>
      <div><label for="ed">Date</label><input id="ed" name="date" type="date" required value="${esc(v.date)}"></div>
      <div><label for="eh">Time</label><input id="eh" name="time" maxlength="60" value="${esc(v.time)}"></div>
      <div><label for="el">Where</label><input id="el" name="location" maxlength="160" value="${esc(v.location)}"></div>
      <div><label for="ech">Chapter</label><select id="ech" name="chapter">${opts(chapterNames(),v.chapter,"None")}</select></div>
      <div><label for="eo">Organised by</label><input id="eo" name="organiser" maxlength="160" value="${esc(v.organiser)}"></div>
      <div><label for="ec">Coordinator</label><input id="ec" name="coordinator" maxlength="120" value="${esc(v.coordinator)}"></div>
      <div><label for="ek">Link <small>(registration or announcement)</small></label><input id="ek" name="link" type="url" placeholder="https://" value="${esc(v.link)}"></div>
    </div>
    ${campChecks(v.camps)}
    <label for="ex">About the event</label><textarea id="ex" name="description" maxlength="3000" style="min-height:5rem">${esc(v.description)}</textarea>
    <label for="esp">Speakers <small>(name and a line about each)</small></label><textarea id="esp" name="speakers" maxlength="1500" style="min-height:3.5rem">${esc(v.speakers)}</textarea>
    <label for="epr">Programme</label><input id="epr" name="programme" maxlength="1000" value="${esc(v.programme)}">
    ${S.isAdmin?"":reviewNote}<div class="actions"><button class="btn" type="submit">${S.isAdmin?"Save event":"Send for review"}</button><button class="link" type="button" data-act="cancelForm">Cancel</button></div></form>`;
}

/* ================= Recognition register ================= */
const PICON={Statue:'<path d="M12 3a2.2 2.2 0 1 1 0 4.4A2.2 2.2 0 0 1 12 3zM9 9h6l1 6h-2l-.5 4h-3L10 15H8z"/><path d="M6 21h12"/>',Bust:'<circle cx="12" cy="7.5" r="3.2"/><path d="M6 17c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M7 17h10v4H7z"/>',"Named after him":'<path d="M12 3v18M6 6h11l2 2.5L17 11H6zM18 13H7l-2 2.5L7 18h11z"/>',Memorial:'<path d="M9 21V7l3-4 3 4v14M6 21h12M10.5 11h3"/>',Observance:'<rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M4 9.5h16M8.5 3v4M15.5 3v4M9 14l2 2 4-4"/>',Honour:'<circle cx="12" cy="15" r="5"/><path d="M9 3l3 6 3-6M12 12.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z"/>',"Museum or display":'<path d="M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18"/>',Proposal:'<path d="M4 20h16M6 20V10l6-5 6 5v10M10 20v-5h4v5"/><path d="M3 4l3 3M21 4l-3 3" stroke-dasharray="2 2"/>',Other:'<circle cx="12" cy="12" r="8"/><path d="M12 8v5M12 16h.01"/>'};
const pIcon=(k,cls)=>`<svg class="${cls||"aicon"}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">${PICON[k]||PICON.Other}</svg>`;
const pStat=p=>p.kind==="Proposal"?"proposed":p.status==="verified"?"verified":"checking";
const PSTAT={verified:["Verified","#303B30"],checking:["Under verification","#B09555"],proposed:["Proposed","#762633"]};
const pPhoto=p=>p.photo?{url:p.photo,real:true}:(p.images||[])[0]?{url:p.images[0].url,real:false}:null;
const pKey=p=>p.lat&&p.lng?`${(Math.round(p.lat*2)/2).toFixed(1)},${(Math.round(p.lng*2)/2).toFixed(1)}`:"";
const RLAB={Bikaner:"tl",Churu:"tr",Jodhpur:"bl",Jaipur:"br","Nathu La":"tl",Dhaka:"l"};
function regMap(list){
  const groups={};for(const p of list.filter(p=>p.lat&&p.lng)){const key=pKey(p);(groups[key]=groups[key]||[]).push(p)}
  const pins=Object.values(groups).map(g=>{const cs=g.map(x=>x.city||x.location),mode=cs.sort((a,b)=>cs.filter(v=>v===b).length-cs.filter(v=>v===a).length)[0],p={...g[0],city:mode},st=g.some(x=>pStat(x)==="verified")?"verified":g.every(x=>pStat(x)==="proposed")?"proposed":"checking";return {lat:p.lat,lng:p.lng,city:p.city||p.location,state:p.state,n:g.length,st,key:pKey(g[0])}});
  return `<svg viewBox="0 0 ${INDIA.W} ${INDIA.H}" role="img" aria-label="Map of recognition sites"><path d="${INDIA.d}" class="imap-land"/>
  ${pins.map(q=>{const [x,y]=inP(q.lat,q.lng),on=S.f.ploc===q.key||S.f.ploc===q.city,r=8+Math.min(q.n,4)*2;return `<g class="rpin ${q.st}${on?" on":""}" transform="translate(${x.toFixed(0)} ${y.toFixed(0)})" data-act="ploc" data-id="${esc(on?"":q.key)}" role="button" tabindex="0" aria-label="${esc(q.city)}: ${q.n} ${q.n===1?"entry":"entries"}"><circle r="${r+8}" class="rpin-halo"/><circle r="${r}" class="rpin-dot"/><text class="rpin-n" y="5">${q.n}</text>${(()=>{const o=RLAB[q.city]||(q.lng>86?"l":"r"),dx=o.includes("l")?-(r+5):o.includes("r")?r+5:0,dy=o.includes("t")?-(r+6):o.includes("b")?r+18:6;return `<text class="rpin-l" x="${dx}" y="${dy}" text-anchor="${o.includes("l")?"end":o.includes("r")?"start":"middle"}">`})()}${esc(q.city)}</text></g>`}).join("")}
  </svg>`;
}
function regCard(p){
  const st=pStat(p),[sl,sc]=PSTAT[st],ph=pPhoto(p),map=p.lat&&p.lng?`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`:"";
  const facts=[[p.kind==="Honour"?"Conferred by":"Inaugurated by",p.inauguratedBy],["Date",p.date],["Public access",p.accessibility]].filter(r=>r[1]&&!/^(Unknown|Not applicable until built|Not built\. Proposal stage\.|Plan received)/.test(r[1])&&!/to be confirmed/i.test(r[1]));
  return `<article class="rcard ${st}" id="pl-${esc(p.id)}" style="--sc:${sc}">
    <div class="rcard-body">
      <div class="rhead2">${ph?`<a class="rthumb" href="${esc(ph.url)}" target="_blank" rel="noopener"><img src="${esc(ph.url)}" alt="${esc(p.name)}" loading="lazy">${ph.real?"":`<span class="rimg-note">Rendering</span>`}</a>`:`<span class="ricon">${pIcon(p.kind)}</span>`}
      <div><p class="rtype">${esc(p.kind==="Proposal"?"Proposed project":p.kind)} <span class="rstat">${st==="verified"?"✓ ":""}${esc(sl)}</span></p>
      <h3>${esc(String(p.name).split(" / ")[0])}</h3>
      <p class="rloc"><svg class="aicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>${esc([p.city||p.location,p.state].filter(Boolean).join(", "))}</p></div></div>
      ${p.description?`<p class="rdesc">${esc(p.description)}</p>`:""}
      ${facts.length?`<dl class="rfacts">${facts.map(([k,x])=>`<dt>${k}</dt><dd>${esc(x)}</dd>`).join("")}</dl>`:""}
      ${(p.details||[]).length?(()=>{const k="places/"+p.id+"#more",o=S.open.has(k);return `<button class="link evbtn" data-act="toggle" data-id="${esc(k)}" aria-expanded="${o}">${o?"Fewer details":"More details"}</button>${o?`<div class="evpanel">${p.details.map(d=>`<p>${esc(d)}</p>`).join("")}</div>`:""}`})():""}
      ${(p.images||[]).length>1?(()=>{const k="places/"+p.id+"#img",o=S.open.has(k);return `<button class="link evbtn" data-act="toggle" data-id="${esc(k)}" aria-expanded="${o}">${o?"Hide images":`All ${p.images.length} images`}</button>${o?conceptGallery(p):""}`})():""}
      ${(()=>{const key="places/"+p.id+"#src",op=S.open.has(key),cs=p.cites||[];return cs.length||p.source?`<button class="link evbtn" data-act="toggle" data-id="${esc(key)}" aria-expanded="${op}">${op?"Hide sources":"Sources"}</button>${op?`<div class="evpanel">${cs.length?citeList(cs):`<p><a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(p.source)}</a></p>`}</div>`:""}`:""})()}
      ${S.isAdmin&&S.research?statusControl("places",p)+historyPanel("places/"+p.id):""}
      <div class="actions">${map&&!["Observance","Honour","Proposal"].includes(p.kind)?`<a href="${esc(map)}" target="_blank" rel="noopener">Open in maps ↗</a>`:""}${correctionLink("places/"+p.id,p.name)}${S.isAdmin&&S.research?`<button class="link" data-act="del" data-col="places" data-id="${p.id}">Delete</button>`:""}</div>
    </div></article>`;
}
VIEWFN.recognition=()=>{
  const f=S.f,all=S.places.filter(p=>S.isAdmin||p.status!=="rejected");
  const states=[...new Set(all.map(p=>p.state).filter(Boolean))].sort((a,b)=>all.filter(p=>p.state===b).length-all.filter(p=>p.state===a).length);
  const list=all.filter(p=>(!f.pstate||p.state===f.pstate)&&(!f.ploc||(p.city||p.location)===f.ploc||pKey(p)===f.ploc)&&(!f.pkind||p.kind===f.pkind)&&(!f.pst||pStat(p)===f.pst));
  const cnt=st=>all.filter(p=>pStat(p)===st).length;
  const ver=all.filter(p=>pStat(p)==="verified"&&!["Honour","Observance"].includes(p.kind));
  const goa=all.some(p=>p.state==="Goa"&&pStat(p)==="verified");
  const kinds=PKINDS.filter(k=>all.some(p=>p.kind===k));
  const chip=(key,val,label,n)=>`<button class="atype${f[key]===val?" on":""}" data-act="pf" data-id="${esc(key+"|"+(f[key]===val?"":val))}">${label}${n!=null?` <i>${n}</i>`:""}</button>`;
  const order=p=>({verified:0,checking:1,proposed:2})[pStat(p)];
  const groups=[...new Set(list.map(p=>p.state||"Other"))].sort((a,b)=>states.indexOf(a)-states.indexOf(b));
  return `<section class="llanding rlanding"><div class="llanding-inner rhead">
    <div><p class="eyebrow">SSRF Recognition register</p><h2>Where he is remembered</h2>
    <p>Statues, busts, places named after him, memorials, honours and days observed in his honour, with the evidence for each. Select a place on the map to see its entries.</p>
    <div class="rstats">${["verified","checking","proposed"].map(s=>`<button class="rstatb ${s}${f.pst===s?" on":""}" data-act="pf" data-id="pst|${f.pst===s?"":s}" style="--sc:${PSTAT[s][1]}"><b>${cnt(s)}</b><span>${PSTAT[s][0]}</span></button>`).join("")}</div>
    ${goa?"":`<p class="rgoa"><b>Goa has no verified memorial to him yet.</b> The state whose capital his brigade reached on 19 December 1961 has no public statue, road or building named for him that the foundation has found.</p>`}
    ${S.isAdmin&&!S.offline?`<p><button class="link rlink" data-act="researchMode">${S.research?"Hide research notes (show the public view)":"Show research notes (editors only)"}</button></p>`:""}</div>
    <figure class="imap rmap">${regMap(all)}<figcaption><span class="lg verified"></span>Verified <span class="lg checking"></span>Under verification <span class="lg proposed"></span>Proposed. Positions are approximate. Boundary: DataMeet India composite map (CC BY 4.0).</figcaption></figure>
  </div></section>${accessNotice()}${myPendingPanel("place")}
  ${ver.some(p=>p.photo)?`<h2 class="sect">Verified memorials</h2><div class="rgal">${ver.filter(p=>p.photo).map(p=>{const ph=p.photo;return `<a href="#recognition" data-act="jump" data-id="pl-${esc(p.id)}" class="rgal-item">${ph?`<img src="${esc(ph)}" alt="${esc(p.name)}" loading="lazy">`:`<div class="rgal-ph">${pIcon(p.kind,"aicon big")}</div>`}<span><b>${esc(String(p.name).split(" / ")[0])}</b>${esc([p.city,p.state].filter(Boolean).join(", "))}</span></a>`}).join("")}</div>`:""}
  <div class="rfilters">
    <div class="rfrow"><span class="rflab">Region</span>${chip("pstate","","All",all.length).replace('data-id="pstate|"','data-id="pstate|"')}${states.map(s=>chip("pstate",s,esc(s),all.filter(p=>p.state===s).length)).join("")}</div>
    ${f.pstate?`<div class="rfrow"><span class="rflab">Place</span>${[...new Set(all.filter(p=>p.state===f.pstate).map(p=>p.city||p.location))].map(c=>chip("ploc",c,esc(c),all.filter(p=>(p.city||p.location)===c).length)).join("")}</div>`:""}
    <div class="rfrow"><span class="rflab">Type</span>${kinds.map(k=>chip("pkind",k,pIcon(k)+esc(k),all.filter(p=>p.kind===k).length)).join("")}</div>
    <div class="bar">${f.pstate||f.ploc||f.pkind||f.pst?`<button class="link" data-act="pclear">Clear all filters</button>`:""}<span class="meta">${list.length} of ${all.length} entries</span><span class="grow"></span>${contributeBtn("form","place","Add an entry")}</div>
  </div>
  ${S.form==="place"?(canPost()&&me()?placeForm({}):needJoin("add an entry")):""}
  ${!isReady("places")?`<p class="empty">Loading…</p>`:list.length?groups.map(g=>`<h2 class="sect rstate">${esc(g)} <span>${list.filter(p=>(p.state||"Other")===g).length}</span></h2><div class="rgrid">${list.filter(p=>(p.state||"Other")===g).sort((a,b)=>order(a)-order(b)||String(a.city).localeCompare(String(b.city))).map(regCard).join("")}</div>`).join(""):`<p class="empty">No entries match these filters.</p>`}`;
};
function conceptGallery(p,limit){
  const imgs=(p.images||[]).filter(i=>i&&i.url).slice(0,limit||99);
  if(!imgs.length)return "";
  return `<div class="concept"><p class="concept-note"><b>Artists' renderings, not photographs.</b> ${esc(p.imagesNote||"")}</p><div class="concept-grid">${imgs.map(i=>`<figure${i.wide?' class="wide"':""}><a href="${esc(i.url)}" target="_blank" rel="noopener"><img src="${esc(i.url)}" alt="${esc(i.caption||p.name)} (artist's rendering)" loading="lazy"${i.fit==="contain"?' class="fit"':""}></a><figcaption>${esc(i.caption||"")}</figcaption></figure>`).join("")}</div></div>`;
}
function placeForm(v){
  return `<form class="panel" id="placeForm"${S.resub?` data-resub="${esc(S.resub)}"`:""}>
    <label for="qn">What is it?</label><input id="qn" name="name" required maxlength="140" value="${esc(v.name)}" placeholder="Statue at the district stadium">
    <div class="grid2">
      <div><label for="qk">Kind</label><select id="qk" name="kind">${opts(PKINDS,v.kind||"Statue")}</select></div>
      <div><label for="qd">Date established</label><input id="qd" name="date" maxlength="60" value="${esc(v.date)}"></div>
      <div><label for="qc">City or town</label><input id="qc" name="city" required maxlength="120" value="${esc(v.city)}"></div>
      <div><label for="qdi">District</label><input id="qdi" name="district" maxlength="120" value="${esc(v.district)}"></div>
      <div><label for="qs">State or country</label><input id="qs" name="state" required maxlength="60" value="${esc(v.state)}"></div>
      <div><label for="qi">Inaugurated by <small>(for an honour or award: conferred by)</small></label><input id="qi" name="inauguratedBy" maxlength="200" value="${esc(v.inauguratedBy)}"></div>
      <div><label for="qa">Public access</label><input id="qa" name="accessibility" maxlength="120" value="${esc(v.accessibility)}"></div>
      <div><label for="qm2">Maintained?</label><select id="qm2" name="maintained">${opts(["Yes","No","Unknown"],v.maintained||"Unknown")}</select></div>
      <div><label for="qla">Latitude <small>(optional)</small></label><input id="qla" name="lat" inputmode="decimal" value="${esc(v.lat)}"></div>
      <div><label for="qln">Longitude</label><input id="qln" name="lng" inputmode="decimal" value="${esc(v.lng)}"></div>
    </div>
    ${campChecks(v.camps)}
    <label for="qx">Historical background and details</label><textarea id="qx" name="description" maxlength="1500" style="min-height:5rem">${esc(v.description)}</textarea>
    <label for="qr">Evidence link <small>(news report, government notice, a link to your photograph)</small></label><input id="qr" name="source" type="url" placeholder="https://" value="${esc(v.source)}">
    ${reviewNote}<div class="actions"><button class="btn" type="submit">Send for review</button><button class="link" type="button" data-act="cancelForm">Cancel</button></div></form>`;
}

/* ================= About ================= */
VIEWFN.about=()=>{
  const st=S.site.settings||{},editing=S.edit==="site/settings";
  return `<h2>About SSRF</h2>
  <p class="sub">The Sagat Singh Research Foundation preserves the evidence of Lt Gen Sagat Singh's career, researches his campaigns and the people who fought them, and makes that history usable by schools, researchers and the public.</p>
  ${accessNotice()}
  <h3 class="sect" id="sec-governance">Governance and contact</h3>
  ${editing?`<form class="panel" id="settingsForm">
    <label for="g1">Governing body</label><textarea id="g1" name="governance" style="min-height:4rem">${esc(st.governance)}</textarea>
    <label for="g2">Research and Editorial Council</label><textarea id="g2" name="council" style="min-height:4rem">${esc(st.council)}</textarea>
    <div class="grid2"><div><label for="g3">Contact email</label><input id="g3" name="email" type="email" value="${esc(st.email)}"></div><div><label for="g4">Postal address</label><input id="g4" name="address" value="${esc(st.address)}"></div>
    <div><label for="g5">Registered as</label><input id="g5" name="registration" value="${esc(st.registration)}" placeholder="Trust or society, registration number"></div><div><label for="g6">Person responsible for personal data</label><input id="g6" name="dataOfficer" value="${esc(st.dataOfficer)}"></div></div>
    <label for="g7">Social media (one per line: name | full web address)</label><textarea id="g7" name="social" style="min-height:3.5rem" placeholder="YouTube | https://www.youtube.com/@...">${esc(st.social||"")}</textarea>
    <div class="actions"><button class="btn small" type="submit">Save</button><button class="link" type="button" data-act="cancelEdit">Cancel</button></div></form>`:
  `<table class="plain meta-table"><tbody>
    ${st.registration?`<tr><th>Registered as</th><td>${esc(st.registration)}</td></tr>`:""}
    <tr><th>Governing body</th><td>${esc(st.governance||"The governing body consists of the founder, a member of Lt Gen Sagat Singh's family, retired senior officers and others.")}</td></tr>
    <tr><th>Research and Editorial Council</th><td>${esc(st.council||"Retired senior officers, military historians, specialists in the 1961, 1967 and 1971 campaigns, a representative of the Sagat Singh family, an archivist and an academic editor.")}</td></tr>
    ${st.email?`<tr><th>Contact</th><td><a href="mailto:${esc(st.email)}">${esc(st.email)}</a></td></tr>`:""}${st.address?`<tr><th>Address</th><td>${esc(st.address)}</td></tr>`:""}
    ${st.dataOfficer?`<tr><th>Personal data requests</th><td>${esc(st.dataOfficer)}</td></tr>`:""}
  </tbody></table>${S.isAdmin?`<p><button class="btn small ghost" data-act="edit" data-id="site/settings">${st.email?"Edit governance and contact":"Add the foundation's contact details"}</button></p>`:""}`}
  <h3 class="sect" id="sec-standards">How we judge evidence</h3>
  <p class="prose">Two separate questions are asked of everything on this site: what kind of material is it, and how well is the claim supported? A recorded memory can be genuine and still uncorroborated; an official record can be authentic and still incomplete.</p>
  <table class="plain"><thead><tr><th>Nature of the material</th><th>Means</th></tr></thead><tbody>${NATURE.map(n=>`<tr><td>${natureTag(n)}</td><td>${esc(NATURE_HELP[n])}</td></tr>`).join("")}</tbody></table>
  <table class="plain" style="margin-top:1rem"><thead><tr><th>Assessment of the claim</th><th>Means</th></tr></thead><tbody>${Object.keys(ASSESS).map(k=>`<tr><td>${assessTag(k)}</td><td>${esc(ASSESS_HELP[k])}</td></tr>`).join("")}</tbody></table>
  <p class="prose">A family memory or a popular anecdote never becomes a documented fact by being repeated. Where sources disagree, both are shown. Places, library items and archive items carry a single verification status: ${Object.values(VSTAT).join(", ")}.</p>
  <h3 class="sect">How contributions are reviewed</h3>
  <ol class="prose"><li>You send a story, an archive item, a library item, a place or an event. It is visible only to you and the editors.</li><li>It is assigned to an editor with a due date and moves through screening, research review, fact-check and editorial approval. Simple items such as event listings may skip stages.</li><li>An editor may ask you for more evidence. You then edit and resubmit, and the original, the comments and each revision are kept.</li><li>No one publishes, labels or verifies their own contribution, and reviewers declare any family, authorship or financial interest and pass the item on.</li><li>Anyone can suggest a correction on any entry. A correction is complete only when the public text has been changed, or the reason for not changing it is recorded. Every change is kept in the entry's public history.</li></ol>
  <h3 class="sect">Privacy notice</h3>
  <ul class="prose">
    <li><b>Who holds your data.</b> The Sagat Singh Research Foundation${st.email?`, contactable at ${esc(st.email)}`:""}.</li>
    <li><b>What we hold.</b> The name you choose to show, your membership category, chapter, interests and what you contribute. We never ask for phone numbers, service numbers or identity documents.</li>
    <li><b>Who sees it.</b> Listed profiles are public. If you hide your profile, your details are stored separately and are visible only to you and the foundation's editors.</li>
    <li><b>How long.</b> Your profile is kept while you are a member. Published contributions are kept as part of the historical record under the archival policy below.</li>
    <li><b>Your choices</b>, from <a href="#account">My account</a>: hide your public profile; remove your profile; ask for your name to be removed from published contributions (anonymisation); withdraw a published contribution; or ask for your personal data to be deleted. These are different actions, and each is explained there.</li>
    <li><b>Oral histories and family documents.</b> Consent to public attribution and consent to storage are recorded separately. You can withdraw a recording or document; it is unpublished within 30 days, and kept in restricted storage only if you agree.</li>
    <li><b>Archival policy.</b> Historical material of lasting value may be kept after a contributor leaves, without their name, so the record stays complete. The decision log keeps who made each editorial decision.</li>
    <li>Anyone under 18 should take part through a teacher or parent, not their own account.</li>
  </ul>
  <h3 class="sect" id="sec-corrections">Corrections and copyright</h3>
  <p class="prose">Editors respond to corrections within 14 days. Videos and articles by others are linked, never re-hosted, so credit stays with their makers. Archive items carry their rights status; an item whose rights are unknown is not offered for download. To ask for something to be removed, use "Suggest a correction" on it.</p>
  <h3 class="sect">The platform</h3>
  <p class="prose">This site is the foundation's working prototype, hosted on claude.ai. The permanent platform, on SSRF's own domain with its own database, archive storage and backups, is being planned; everything recorded here will move to it.</p>`;
};

/* ================= Account ================= */
function myPendingPanel(kind){
  const p=mySubs().filter(x=>x.kind===kind&&!["published","withdrawn","resolved"].includes(x.status));if(!p.length)return "";
  return `<div class="panel" style="border-left-color:var(--brass)"><b>Your contributions in review</b><ul style="margin:.4rem 0 0">${p.map(x=>`<li>${esc(x.data?.title||x.data?.name||"Untitled")} <span class="tag">${esc(STAGES[x.status]||x.status)}</span>${x.status==="evidence"?` <a href="#account">Edit and resubmit</a>`:""}</li>`).join("")}</ul></div>`;
}
const FORMFN={story:storyForm,book:v=>bookForm(v,null),place:placeForm,event:eventForm,archive:archiveForm};
VIEWFN.account=()=>{
  if(S.offline||!S.db)return `<h2>Join</h2>${accessNotice()||`<p class="empty">Connecting…</p>`}`;
  if(!S.uid)return `<h2>Join</h2><div class="notice">Sign in to claude.ai, or ask the foundation to invite you by email, to join.</div>`;
  if(S.access!=="ok")return `<h2>Join</h2>${accessNotice()}`;
  const m=me();
  if(!m)return `<h2>Join the community</h2><p class="sub">Choose what others see. Don't add phone numbers or service numbers.</p>${profileForm({})}`;
  const subs=mySubs().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  const resub=S.resub?subs.find(x=>x.id===S.resub):null;
  const published=[...S.stories.filter(s=>s.authorId===S.uid).map(s=>["stories/"+s.id,s.title]),...S.archive.filter(a=>a.authorId===S.uid).map(a=>["archive/"+a.id,a.title])];
  return `<h2>My account</h2>
  ${resub?`<h3 class="sect">Revise: ${esc(resub.data?.title||resub.data?.name)}</h3>${resub.note?`<div class="panel" style="border-left-color:var(--brass)"><b>Editor's comments</b><p style="margin:.3rem 0 0">${esc(resub.note)}</p></div>`:""}${FORMFN[resub.kind]?FORMFN[resub.kind](resub.data||{}):""}`:""}
  <h3 class="sect">My contributions</h3>
  ${subs.length?subs.map(x=>{const d=x.data||{},h=x.history||[];return `<article class="story"><div><span class="tag">${esc({story:"Story",book:"Library item",place:"Recognition entry",event:"Event",archive:"Archive item",correction:"Correction",privacy:"Data request",access:"Access request"}[x.kind]||x.kind)}</span><span class="tag st-${x.status==="published"||x.status==="resolved"?"verified":x.status==="evidence"?"evidence":x.status==="rejected"?"rejected":"checking"}">${esc(STAGES[x.status]||x.status)}</span></div>
    <h3>${esc(d.title||d.name||(x.kind==="privacy"?"Request about my data":x.kind==="correction"?"On: "+d.title:"Untitled"))}</h3>
    <ol class="trail">${h.map(e=>`<li><b>${fmtDate(e.at)}</b> ${esc(STAGES[e.status]||e.status)}${e.note?`: ${esc(e.note)}`:""}</li>`).join("")}</ol>
    ${x.note&&!h.some(e=>e.note===x.note)?`<p class="meta"><b>Editor's comments:</b> ${esc(x.note)}</p>`:""}
    <div class="actions">${x.status==="evidence"&&FORMFN[x.kind]?`<button class="btn small" data-act="resub" data-id="${x.id}">Edit and resubmit</button>`:""}${!["published","resolved","withdrawn","rejected"].includes(x.status)?`<button class="link" data-act="withdrawSub" data-id="${x.id}">Withdraw</button>`:""}${(h.filter(e=>e.prev).length)?`<span class="meta">${h.filter(e=>e.prev).length} earlier version(s) kept</span>`:""}</div></article>`}).join(""):`<p class="meta">Nothing yet. Contribute from <a href="#stories">Stories</a>, the <a href="#archive">archive</a>, the <a href="#library">library</a>, <a href="#recognition">recognition</a> or <a href="#events">events</a>.</p>`}
  <h3 class="sect">My profile</h3>${profileForm(m)}
  <h3 class="sect">My data</h3>
  <table class="plain"><thead><tr><th>Action</th><th>What happens</th></tr></thead><tbody>
    <tr><td>Hide my public profile</td><td>Untick "List me" above. Your name leaves the members list at once; your details stay visible only to you and the editors.</td></tr>
    <tr><td>Remove my profile</td><td>Deletes your profile, salutes and event registrations now. Your past contributions and the editorial log remain, under your chosen attribution, until you ask for anonymisation or deletion.</td></tr>
    <tr><td>Anonymise me</td><td>Editors replace your name with "A member" on everything you have published. The material stays in the record.</td></tr>
    <tr><td>Withdraw a contribution</td><td>Editors unpublish the item you choose within 30 days.</td></tr>
    <tr><td>Delete my personal data</td><td>Editors delete your profile and anonymise your contributions. Historical material may be kept without your name under the archival policy.</td></tr>
  </tbody></table>
  ${S.form==="privacy"?`<form class="panel" id="privacyForm"><label for="pt">What would you like?</label><select id="pt" name="type"><option value="anonymise">Anonymise me on published contributions</option><option value="withdraw">Withdraw a published contribution</option><option value="delete">Delete my personal data</option><option value="other">Something else</option></select>
    <label for="pi">Which contribution? <small>(for a withdrawal)</small></label><select id="pi" name="item">${opts([],"","None")}${published.map(([k,t])=>`<option value="${esc(k)}">${esc(t)}</option>`).join("")}</select>
    <label for="pd">Anything else we should know</label><textarea id="pd" name="detail" maxlength="1500" style="min-height:4rem"></textarea>
    <div class="actions"><button class="btn small" type="submit">Send request</button><button class="link" type="button" data-act="cancelForm">Cancel</button></div></form>`:`<div class="actions"><button class="btn small ghost" data-act="form" data-id="privacy">Make a data request</button><button class="link" data-act="leave">Remove my profile now</button></div>`}`;
};
function profileForm(m){
  return `<form class="panel" id="joinForm">
    <label for="jn">Name to show <small>(your name, or a name you prefer to use here)</small></label><input id="jn" name="name" required maxlength="80" value="${esc(m.name)}">
    <div class="grid2"><div><label for="jr">Membership category</label><select id="jr" name="category">${opts(CATEGORIES,m.category||"Patron or supporter")}</select></div>
    <div><label for="jc">Chapter</label><select id="jc" name="chapter">${opts(chapterNames(),m.chapter||"Goa")}</select></div></div>
    <div class="grid2"><div><label for="jt">Rank or title <small>(optional, e.g. Col (Retd), Dr, Prof)</small></label><input id="jt" name="title" maxlength="40" value="${esc(m.title)}"></div>
    <div><label for="ja">Unit, institution or affiliation <small>(optional)</small></label><input id="ja" name="affiliation" maxlength="120" value="${esc(m.affiliation)}"></div></div>
    <label for="jx">Your connection to Sagat Singh <small>(unit you served in, what draws you to his story)</small></label><textarea id="jx" name="connection" maxlength="600" style="min-height:4rem">${esc(m.connection)}</textarea>
    <label for="ji">Areas of interest</label><input id="ji" name="interests" maxlength="300" value="${esc(m.interests)}">
    ${campChecks(m.camps)}
    <fieldset class="photo-consent"><legend>Photograph <small>(optional)</small></legend>
      ${m.photo?`<p class="meta"><img src="${esc(m.photo)}" alt="" style="width:3.5rem;height:3.5rem;object-fit:cover;vertical-align:middle;border:1px solid var(--line)"> Current photograph.</p>`:""}
      <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" aria-label="Photograph of yourself">
      <label class="check"><input type="checkbox" name="photoConsent" ${m.photoConsent?"checked":""}> I consent to this photograph of me being shown in the public members directory. I can withdraw consent at any time by unticking this box.</label>
      ${m.photo?`<label class="check"><input type="checkbox" name="photoRemove"> Remove my photograph</label>`:""}
    </fieldset>
    <label class="check"><input type="checkbox" name="listed" ${m.listed===false?"":"checked"}> List me in the members directory</label>
    <label class="check"><input type="checkbox" name="showChapter" ${m.showChapter===false?"":"checked"}> Show my chapter</label>
    <label class="check"><input type="checkbox" name="showContrib" ${m.showContrib?"checked":""}> Show how many contributions I have published</label>
    <label class="check"><input type="checkbox" name="adult" required ${m.adult||m.name?"checked":""}> I am 18 or older</label>
    <p class="meta">See the <a href="#about">privacy notice</a> for how your information is used.</p>
    <div class="actions"><button class="btn" type="submit">${m.name?"Save profile":"Join"}</button></div></form>`;
}

/* ================= Search ================= */
function searchIndex(){
  const R=[];const add=(type,title,text,extra)=>R.push({type,title:title||"",text:text||"",...extra});
  for(const c of S.claims)add(c.scope==="life"?"Biography":"Campaign finding",(c.year?c.year+" ":"")+c.heading,[c.text,c.unresolved].join(" "),{camps:c.scope==="life"?[]:[c.scope],assess:c.assessment,href:c.scope==="life"?"#life":"#campaigns",act:c.scope==="life"?"":"camp",id:c.scope});
  for(const c of S.camps)add("Campaign",c.name,[c.lead,c.background,c.role,c.significance,(c.unknowns||[]).join(" "),(c.units||[]).join(" ")].join(" "),{camps:[c.id],href:"#campaigns",act:"camp",id:c.id});
  for(const s of S.stories)add("Story",s.title,[s.body,s.unit,s.where,s.narrator].join(" "),{camps:s.camps,assess:s.assessment,href:"#stories",act:"openStory",id:s.id});
  for(const a of S.archive)if(a.status!=="rejected")add("Archive item",a.title,[a.description,a.transcript,a.people,a.units,a.location,a.id].join(" "),{camps:a.camps,href:"#archive",act:"openItem",id:a.id});
  for(const b of S.books)add(b.kind==="Documentary or video"?"Video":"Library",b.title,[b.creator,b.description,b.note].join(" "),{camps:b.camps,href:b.link||"#library",ext:!!b.link});
  for(const p of S.places)if(p.status!=="rejected")add("Recognition",p.name,[p.description,p.city,p.state,p.inauguratedBy].join(" "),{camps:p.camps,href:"#recognition"});
  for(const e of S.events)add("Event",e.title,[e.description,e.summary,e.location,e.speakers].join(" "),{camps:e.camps,href:"#events"});
  for(const e of S.entities)add(e.type==="unit"?"Unit":"Person",e.name,e.role,{camps:e.camps,href:"#people",act:"jump",id:e.id});
  for(const s of S.sources.values())add("Source",s.title,[s.author,s.note].join(" "),{href:"#sources"});
  for(const m of S.members.values())add("Member",m.name,[m.connection,m.interests,m.chapter].join(" "),{href:"#members"});
  return R;
}
VIEWFN.search=()=>{
  const q=S.f.q.trim(),f=S.f;let res="";
  if(q.length>=2){
    const toks=q.toLowerCase().split(/\s+/).filter(t=>t.length>1),phrase=q.toLowerCase();
    const scored=searchIndex().filter(r=>(!f.stype||r.type===f.stype)&&(!f.scamp||(r.camps||[]).includes(f.scamp))&&(!f.sassess||r.assess===f.sassess)).map(r=>{
      const T=r.title.toLowerCase(),X=r.text.toLowerCase();let s=0;
      for(const t of toks){if(T.includes(t))s+=5;const n=X.split(t).length-1;s+=Math.min(n,5)}
      if(T.includes(phrase))s+=10;else if(X.includes(phrase))s+=4;
      if(toks.length&&!toks.every(t=>T.includes(t)||X.includes(t)))s=Math.floor(s/3);
      return {...r,s};}).filter(r=>r.s>0).sort((a,b)=>b.s-a.s);
    const mark=s=>{let h=esc(s);for(const t of toks)h=h.replace(new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),m=>`<mark>${m}</mark>`);return h};
    const excerpt=r=>{const X=r.text,i=X.toLowerCase().indexOf(toks[0]||"");if(i<0)return X.slice(0,160);const a=Math.max(0,i-70);return (a?"…":"")+X.slice(a,a+170)+(a+170<X.length?"…":"")};
    res=scored.length?`<p class="meta">${scored.length} ${scored.length===1?"result":"results"}, most relevant first</p><ol class="results">${scored.slice(0,60).map(r=>`<li><span class="tag">${esc(r.type)}</span>${r.assess?assessTag(r.assess):""}<a href="${esc(r.href)}"${r.ext?' target="_blank" rel="noopener"':""}${r.act?` data-act="${r.act}" data-id="${esc(r.id)}"`:""}>${mark(r.title)}</a><p>${mark(excerpt(r))}</p></li>`).join("")}</ol>`:`<p class="empty">Nothing found for "${esc(q)}".</p>`;
  }
  return `<h2>Search</h2><p class="sub">One search across his life, the campaigns, stories, the archive, the library, videos, people and units, the recognition register, events, sources and members.</p>
  <form id="searchForm" class="inline-form" role="search"><input id="q" name="q" type="search" value="${esc(S.f.q)}" placeholder="Try Meghna, Nathu La, Panjim, Gorkha" aria-label="Search"><button class="btn small" type="submit">Search</button></form>
  <div class="bar" style="margin-top:.8rem"><select data-f="stype" aria-label="Type">${opts(["Biography","Campaign","Campaign finding","Story","Archive item","Library","Video","Person","Unit","Recognition","Event","Source","Member"],f.stype,"All types")}</select>
  <select data-f="scamp" aria-label="Campaign">${kopts(Object.fromEntries(S.camps.map(c=>[c.id,c.name])),f.scamp,"All campaigns")}</select>
  <select data-f="sassess" aria-label="Assessment">${kopts(ASSESS,f.sassess,"Any assessment")}</select></div>${res}`;
};
