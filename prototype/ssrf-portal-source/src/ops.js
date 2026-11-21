/* ================= Review (Command Centre) ================= */
const KINDLABEL={story:"Story",book:"Library item",place:"Recognition entry",event:"Event",archive:"Archive item",correction:"Correction",privacy:"Data request",access:"Access request"};
const OPEN=["submitted","screening","research","factcheck","approval","evidence"];
function targetValue(target){
  const [path,field]=target.split("#"),[col,id]=path.split("/");
  if(col==="campaigns"){const c=S.camps.find(x=>x.id===id);if(!c)return null;const fl=field||"lead";const v=c[fl];return {col,id,field:fl,value:Array.isArray(v)?v.map(r=>typeof r==="string"?r:[r.d,r.e||r.c,r.s].filter(Boolean).join(" | ")).join("\n"):v||"",list:Array.isArray(v)}}
  const arr={claims:S.claims,stories:S.stories,books:S.books,places:S.places,events:S.events,archive:S.archive,entities:S.entities}[col];if(!arr)return null;
  const r=arr.find(x=>x.id===id);if(!r)return null;const fl=field&&field!=="status"&&field!=="report"&&field!=="transcript"?field:EDITABLE[col];return {col,id,field:fl,value:r[fl]||""};
}
function coiBlock(x){
  if(x.owner===S.uid)return "This is your own contribution. Another editor must review it.";
  if((x.coi||[]).includes(S.uid))return "You declared a conflict of interest on this item.";
  const mine=S.priv.get(S.uid),theirs=S.priv.get(x.owner);
  if(mine&&theirs&&mine.category==="Family and legacy member"&&theirs.category==="Family and legacy member")return "You and the contributor are both registered as family members. Another editor should review this.";
  return "";
}
VIEWFN.review=()=>{
  if(!S.isAdmin)return `<h2>Review</h2><p class="empty">This page is for the foundation's editors.</p>`;
  const subs=allSubs(),t=todayISO(),f=S.f;
  const open=subs.filter(x=>OPEN.includes(x.status));
  const overdue=x=>x.due&&x.due<t;
  const shown=open.filter(x=>f.rq==="all"||(f.rq==="mine"&&x.assignee===S.uid)||(f.rq==="unassigned"&&!x.assignee)||(f.rq==="overdue"&&overdue(x))).sort((a,b)=>({High:0,Normal:1,Low:2}[a.priority||"Normal"]-{High:0,Normal:1,Low:2}[b.priority||"Normal"])||String(a.due||a.createdAt).localeCompare(String(b.due||b.createdAt)));
  const stat=(n,l,warn)=>`<div class="stat${warn?" warn":""}"><b>${n}</b><span>${l}</span></div>`;
  const editors=Object.fromEntries([...S.priv.entries()].map(([id,m])=>[id,m.name||id]));
  return `<h2>Review</h2>
  <p class="sub">What is waiting, who has it, and when it is due. You cannot publish, assess or verify your own contributions, and you must declare any family, authorship or financial interest.</p>
  <div class="stats">${stat(open.filter(x=>!["correction","privacy","access"].includes(x.kind)).length,"contributions open")}${stat(open.filter(x=>x.assignee===S.uid).length,"assigned to you")}${stat(open.filter(x=>!x.assignee).length,"unassigned")}${stat(open.filter(overdue).length,"overdue",open.some(overdue))}${stat(open.filter(x=>x.kind==="correction").length,"corrections")}${stat(open.filter(x=>x.kind==="privacy"||x.kind==="access").length,"data and access requests")}${stat(S.places.filter(p=>!["verified","rejected"].includes(p.status)).length+S.books.filter(b=>!["verified","rejected"].includes(b.status)).length+S.archive.filter(a=>!["verified","rejected"].includes(a.status)).length,"entries awaiting verification")}${stat(S.events.filter(e=>e.date<t&&!e.summary).length,"past events without a report")}</div>
  <div class="bar"><select data-f="rq" aria-label="Show">${kopts({mine:"Assigned to me",unassigned:"Unassigned",overdue:"Overdue",all:"Everything open"},f.rq)}</select><span class="meta">${shown.length} shown</span></div>
  ${shown.length?shown.map(x=>reviewCard(x,editors)).join(""):`<p class="empty">Nothing here. Try "Everything open".</p>`}
  <h3 class="sect">Backups</h3>${backupPanel()}
  <h3 class="sect">Decision log</h3>
  ${S.revisions.length?`<table class="plain"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Reason</th></tr></thead><tbody>${page("log",S.revisions).map(r=>`<tr><td>${fmtDate(r.at)}</td><td>${esc(nameOf(r.by))}</td><td>${esc(r.action)}: ${esc(r.title||r.target)}</td><td>${esc(r.reason||"")}</td></tr>`).join("")}</tbody></table>${more("log",S.revisions.length)}`:`<p class="empty">No decisions logged yet.</p>`}`;
};
function reviewCard(x,editors){
  const d=x.data||{},block=coiBlock(x),age=daysSince(x.createdAt),dueIn=daysUntil(x.due),path=`${x.owner}/${x.id}`;
  const who=S.priv.get(x.owner);
  let body="";
  if(x.kind==="correction"){
    const tv=targetValue(d.target||"");
    body=`<p class="body"><b>On:</b> ${esc(d.title)}\n<b>Suggested:</b> ${esc(d.text)}</p><p class="meta"><b>Source given:</b> ${esc(d.source)}</p>
    ${tv?`<p class="meta"><b>Current text</b></p><div class="body quote">${esc(tv.value)}</div>`:`<p class="meta">The entry this refers to was not found; it may have been deleted.</p>`}`;
  }else if(x.kind==="privacy")body=`<p class="body"><b>Request:</b> ${esc({anonymise:"Anonymise published contributions",withdraw:"Withdraw a published contribution",delete:"Delete personal data",other:"Other"}[d.type])}${d.item?`\n<b>Item:</b> ${esc(d.item)}`:""}${d.detail?`\n${esc(d.detail)}`:""}</p>`;
  else if(x.kind==="access")body=`<p class="body"><b>Item:</b> ${esc(d.title)} (${esc(d.item)})\n<b>Purpose:</b> ${esc(d.purpose)}</p>`;
  else body=`<div class="body clip">${esc(d.body||d.description||"")}</div>${d.sources?`<p class="meta"><b>Sources:</b> ${esc(d.sources)}</p>`:""}${d.source?`<p class="meta"><b>Evidence:</b> <a href="${esc(d.source)}" target="_blank" rel="noopener">${esc(d.source)}</a></p>`:""}${d.link?`<p class="meta"><a href="${esc(d.link)}" target="_blank" rel="noopener">${esc(d.link)}</a></p>`:""}${(d.files||[]).length?`<p class="meta">${d.files.length} file(s): ${d.files.map(fl=>`<a href="${esc(fl.url||"/_blob/"+fl.assetId)}" target="_blank" rel="noopener">${esc(fl.name)}</a>`).join(", ")}</p>`:""}${x.kind==="event"&&d.date?`<p class="meta">${esc(fmtDay(d.date))}, ${esc(d.location||"")}</p>`:""}`;
  const hist=(x.history||[]).length?`<details class="hist"><summary>History (${x.history.length})</summary><ol>${x.history.map(e=>`<li><b>${fmtDate(e.at)}</b> ${esc(nameOf(e.by))}: ${esc(STAGES[e.status]||e.status)}${e.note?`. ${esc(e.note)}`:""}${e.prev?`<details><summary>Earlier version</summary><div class="body quote">${esc(e.prev.body||e.prev.description||JSON.stringify(e.prev))}</div></details>`:""}</li>`).join("")}</ol></details>`:"";
  const assign=`<form class="inline-form assign" data-sub="${esc(path)}"><select name="assignee" aria-label="Assigned to">${kopts(editors,x.assignee,"Unassigned")}</select><input name="due" type="date" value="${esc(x.due||"")}" aria-label="Due date"><select name="priority" aria-label="Priority">${opts(["High","Normal","Low"],x.priority||"Normal")}</select>${["correction","privacy","access"].includes(x.kind)?"":`<select name="stage" aria-label="Stage">${kopts(Object.fromEntries(STAGE_ORDER.map(s=>[s,STAGES[s]])),STAGE_ORDER.includes(x.status)?x.status:"submitted")}</select>`}<button class="btn small ghost" type="submit">Save assignment</button></form>`;
  let decide="";
  if(block)decide=`<p class="meta"><b>${esc(block)}</b></p>`;
  else if(x.kind==="correction"){const tv=targetValue(d.target||"");decide=`<form class="decide" data-sub="${esc(path)}">${tv?`<label>New text <small>(edit the current text; a list takes one item per line)</small><textarea name="newText" style="min-height:6rem">${esc(tv.value)}</textarea></label>`:""}<label>Reason <small>(required; shown in the public history)</small><input name="note" maxlength="400"></label>${coiCheck()}<div class="actions">${tv?`<button class="btn small" name="d" value="apply">Apply change and resolve</button>`:""}<button class="btn small ghost" name="d" value="resolve">Resolve without change</button><button class="btn small ghost" name="d" value="decline">Decline</button><button class="link" name="d" value="coi">Declare a conflict</button></div></form>`}
  else if(x.kind==="privacy"||x.kind==="access")decide=`<form class="decide" data-sub="${esc(path)}"><label>Note to the member<input name="note" maxlength="400"></label>${coiCheck()}<div class="actions">${x.kind==="privacy"&&d.type==="anonymise"?`<button class="btn small" name="d" value="anonymise">Anonymise their contributions now</button>`:""}${x.kind==="privacy"&&d.type==="withdraw"&&d.item?`<button class="btn small" name="d" value="withdrawItem">Unpublish the item now</button>`:""}${x.kind==="privacy"&&d.type==="delete"?`<button class="btn small" name="d" value="deleteData">Delete profile and anonymise now</button>`:""}<button class="btn small ghost" name="d" value="complete">Mark completed</button><button class="btn small ghost" name="d" value="decline">Decline</button></div></form>`;
  else{
    const next=STAGE_ORDER[STAGE_ORDER.indexOf(x.status)+1];
    decide=`<form class="decide" data-sub="${esc(path)}">
      <div class="grid2">${x.kind==="story"?`<label>Assessment<select name="assessment">${kopts(ASSESS,PROV_ASSESS[d.prov]||"unverified")}</select></label>`:""}${["story","archive","book"].includes(x.kind)?`<label>Nature of material<select name="nature">${opts(NATURE,d.nature||PROV_NATURE[d.prov]||"Secondary research")}</select></label>`:""}</div>
      ${campChecks(d.camps,"camps")}
      <label>Note to the contributor <small>(required unless publishing or advancing)</small><input name="note" maxlength="400"></label>${coiCheck()}
      <div class="actions">${next&&x.status!=="evidence"?`<button class="btn small ghost" name="d" value="advance">Move to ${esc(STAGES[next])}</button>`:""}<button class="btn small" name="d" value="publish">Publish</button><button class="btn small ghost" name="d" value="evidence">Ask for evidence</button><button class="btn small ghost" name="d" value="reject">Reject</button><button class="link" name="d" value="coi">Declare a conflict</button></div></form>`;
  }
  return `<article class="story rcard">
    <div><span class="tag">${esc(KINDLABEL[x.kind]||x.kind)}</span><span class="tag st-${x.status==="evidence"?"evidence":"checking"}">${esc(STAGES[x.status])}</span><span class="tag">${esc(x.priority||"Normal")} priority</span>${x.due?`<span class="tag${dueIn<0?" st-rejected":""}">${dueIn<0?`${-dueIn} days overdue`:`Due ${fmtDate(x.due)}`}</span>`:`<span class="tag">${age} ${age===1?"day":"days"} old</span>`}${x.assignee?`<span class="tag">With ${esc(nameOf(x.assignee))}</span>`:""}</div>
    <h3>${esc(d.title||d.name||KINDLABEL[x.kind])}</h3>
    <div class="meta">From ${esc(nameOf(x.owner))}${who?.category?`, ${esc(who.category)}`:""}${d.prov?`. Says: ${esc({first:"first-hand",family:"family account",research:"from sources"}[d.prov])}`:""}${d.consent?". Consent confirmed":""}${d.editOk?". Editing allowed":""}${x.resubmittedAt?`. Resubmitted ${fmtDate(x.resubmittedAt)}`:""}</div>
    ${body}${hist}${assign}${decide}</article>`;
}
const coiCheck=()=>`<label class="check"><input type="checkbox" name="coi" value="none"> I have no family, authorship or financial interest in this item</label>`;

/* ================= Backups ================= */
function backupPanel(){
  const last=S.revisions.filter(r=>/backup/i.test(r.action)).slice(0,3);
  return `<p class="prose">Three kinds of backup. Keep each in at least two places outside this site. The database backup holds every record and relationship; the media backup holds the original files with SHA-256 checksums; the spreadsheet export is for reading in Excel.</p>
  ${S.downloads?`<div class="actions"><button class="btn small" data-act="backupJson">Download database backup (JSON)</button><button class="btn small ghost" data-act="backupMedia">Download media backup (ZIP)</button><button class="btn small ghost" data-act="backupCsv">Download spreadsheet export (ZIP of CSV)</button></div>`:`<p class="meta">Downloads aren't available in this view.</p>`}
  ${S.busy?`<p class="notice">${esc(S.busy)}</p>`:""}
  ${last.length?`<p class="meta">Recent: ${last.map(r=>`${fmtDate(r.at)}, ${esc(r.action.toLowerCase())}`).join("; ")}</p>`:`<p class="meta">No backup has been taken yet.</p>`}
  <h4>Restore test</h4><p class="prose">Load a database backup to check it is complete and readable against the live records. You can then restore any records that are missing from the site; existing records are never overwritten.</p>
  <label class="btn small ghost upl">Check a backup file<input type="file" accept="application/json,.json" data-verify="1"></label>
  ${S.verify?`<div class="panel">${S.verify.html}${S.verify.missing>0?`<button class="btn small" data-act="restoreMissing">Restore ${S.verify.missing} missing records</button>`:""}</div>`:""}`;
}
const TOP=["claims","campaigns","sources","entities","chapters","stories","books","places","events","archive","quiz","revisions","site","members","memberPrivate","archiveFiles","salutes","attend"];
async function gatherAll(){
  const out={};
  for(const c of TOP){try{out[c]=docs(await S.db.collection(c).get())}catch(e){out[c]=[]}}
  for(const p of ["subs","media"]){out[p]=[];try{const parents=docs(await S.db.collection(p).get());for(const par of parents){out[p].push({id:par.id,items:docs(await S.db.collection(`${p}/${par.id}/items`).get())})}}catch(e){}}
  return out;
}
async function backupJson(){
  S.busy="Collecting every record…";render();
  try{const data=await gatherAll();const body={format:"SSRF database backup",version:3,exportedAt:nowISO(),source:location.href.split("#")[0],collections:data};
    const text=JSON.stringify(body,null,1),hash=await sha256(new TextEncoder().encode(text));
    const n=Object.values(data).reduce((a,b)=>a+b.length,0);
    await S.downloads.save({filename:`ssrf-database-${todayISO()}.json`,data:text});
    await logDecision("Database backup downloaded","backup",`${n} records`,`SHA-256 ${hash}`,{sha:hash});toast("Database backup saved")}
  catch(e){if(e&&e.code!=="declined")toast("The backup couldn't be saved here")}
  S.busy="";render();
}
function toCsv(rows){
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];const cell=v=>{const s=v==null?"":typeof v==="object"?JSON.stringify(v):String(v);return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s};
  return [keys.join(","),...rows.map(r=>keys.map(k=>cell(r[k])).join(","))].join("\n");
}
async function backupCsv(){
  S.busy="Building spreadsheets…";render();
  try{const data=await gatherAll(),files=[];
    for(const [c,rows] of Object.entries(data)){const flat=c==="subs"||c==="media"?rows.flatMap(p=>p.items.map(i=>({owner:p.id,...i}))):rows;if(flat.length)files.push({name:`${c}.csv`,data:"﻿"+toCsv(flat)})}
    await S.downloads.save({filename:`ssrf-spreadsheets-${todayISO()}.zip`,data:makeZip(files)});
    await logDecision("Spreadsheet export downloaded","backup",`${files.length} files`,"");toast("Spreadsheet export saved")}
  catch(e){if(e&&e.code!=="declined")toast("The export couldn't be saved here")}
  S.busy="";render();
}
async function backupMedia(){
  S.busy="Collecting media files…";render();
  try{
    const refs=[];
    for(const m of allMedia())if(m.assetId||(m.url&&m.kind!=="link"))refs.push({url:m.url||"/_blob/"+m.assetId,name:m.name||m.id,record:`media/${m.owner}/items/${m.id}`,caption:m.caption,credit:m.credit});
    for(const a of S.archive)for(const fl of archFiles(a))refs.push({url:fl.url||"/_blob/"+fl.assetId,name:fl.name,record:`archive/${a.id}`,caption:a.title,sha256:fl.sha256});
    const files=[],manifest=[];let i=0;
    for(const r of refs){i++;S.busy=`Fetching file ${i} of ${refs.length}…`;render();
      try{const buf=new Uint8Array(await (await fetch(r.url)).arrayBuffer()),sum=await sha256(buf),name=`files/${String(i).padStart(4,"0")}-${String(r.name||"file").replace(/[^\w.\-]+/g,"_")}`;
        files.push({name,data:buf});manifest.push({file:name,record:r.record,caption:r.caption||"",credit:r.credit||"",bytes:buf.length,sha256:sum,checksumMatches:r.sha256?r.sha256===sum:null})}
      catch(e){manifest.push({record:r.record,error:"Could not fetch "+r.url})}}
    files.unshift({name:"manifest.json",data:JSON.stringify({format:"SSRF media backup",exportedAt:nowISO(),files:manifest},null,1)});
    await S.downloads.save({filename:`ssrf-media-${todayISO()}.zip`,data:makeZip(files)});
    await logDecision("Media backup downloaded","backup",`${manifest.length} files`,manifest.some(m=>m.checksumMatches===false)?"Some checksums did not match":"");toast("Media backup saved");
  }catch(e){if(e&&e.code!=="declined")toast("The media backup couldn't be saved here")}
  S.busy="";render();
}
const canon=o=>JSON.stringify(o,Object.keys(o).sort());
async function verifyBackup(file){
  S.busy="Checking the backup against the live records…";render();
  try{const text=await file.text(),hash=await sha256(new TextEncoder().encode(text)),b=JSON.parse(text);
    if(b.format!=="SSRF database backup")throw new Error("format");
    const known=S.revisions.find(r=>r.sha===hash),live=await gatherAll();let html="",missing=[],changed=0,extra=0,total=0;
    for(const c of TOP){const bk=b.collections[c]||[],lv=new Map((live[c]||[]).map(x=>[x.id,x]));total+=bk.length;
      for(const r of bk){const l=lv.get(r.id);if(!l)missing.push([c,r]);else if(canon(l)!==canon(r))changed++}
      extra+=(live[c]||[]).filter(x=>!bk.some(r=>r.id===x.id)).length}
    html=`<p><b>${known?`This file matches the backup recorded on ${fmtDate(known.at)}.`:"This file is readable, but its checksum is not in the log; it may have been edited or taken elsewhere."}</b></p><p>${total} records checked. ${missing.length} in the backup are missing from the site; ${changed} have changed since; ${extra} are newer than the backup.</p>`;
    S.verify={html,missing:missing.length,rows:missing};
  }catch(e){S.verify={html:"<p><b>This file is not a readable SSRF database backup.</b></p>",missing:0,rows:[]}}
  S.busy="";render();
}
async function restoreMissing(){
  if(!S.verify?.rows?.length)return;if(!confirm(`Restore ${S.verify.rows.length} records? Existing records are not changed.`))return;
  let n=0;for(const [c,r] of S.verify.rows){const {id,...data}=r;try{await S.db.doc(`${c}/${id}`).set(data);n++}catch(e){}}
  await logDecision("Records restored from backup","backup",`${n} records`,"");S.verify=null;toast(`${n} records restored`);render();
}

/* ================= Quiz ================= */
const Q={all:[],qs:[],ready:false,on:false,i:0,picks:[],hint:false,set:"all",teacher:false,shown:false,editing:null};
function quizSet(set){if(set==="all")return Q.all;const [k,v]=set.split(":");return Q.all.filter(q=>q[k]===v)}
function renderQuiz(){
  const el=$("#quiz");if(!el)return;
  if(!Q.on){
    const n=Q.all.length,chip=(set,label)=>{const c=quizSet(set).length;return c?`<button class="chip${Q.set===set?" on":""}" data-act="qSet" data-id="${set}">${esc(label)} <span>${c}</span></button>`:""};
    el.innerHTML=`<h2>How well do you know him?</h2>
    <p style="margin:.2rem 0 .7rem">${n?"Choose a set of questions. Your score appears the moment you finish, with the answers and their explanations.":Q.ready||S.offline?"The quiz is available on the live page.":"Loading the quiz…"}</p>
    ${n?`<div class="chips">${chip("all","All questions")}${Object.entries(QTOPICS).map(([k,v])=>chip("topic:"+k,v)).join("")}</div><div class="chips">${Object.entries(QLEVELS).map(([k,v])=>chip("level:"+k,v)).join("")}</div>
    <label class="check"><input type="checkbox" data-act="qTeacher" ${Q.teacher?"checked":""}> Teacher mode: no scoring, answers revealed on request</label>
    <div class="actions"><button class="btn" data-act="qStart">Start quiz</button></div>`:""}`;return;
  }
  const n=Q.qs.length;
  if(Q.i>=n){
    if(Q.teacher){el.innerHTML=`<h2>End of the questions</h2><p>${n} questions shown in teacher mode.</p><div class="actions"><button class="btn" data-act="qStart">Start again</button><button class="link" data-act="qClose">Close</button></div>`;return}
    const right=Q.picks.filter((p,k)=>p===Q.qs[k].answer).length,pct=Math.round(right/n*100);
    const verdict=pct>=90?"Outstanding. You know his story as well as his own officers did.":pct>=70?"Well done. You know the campaigns that made his name.":pct>=40?"A good start. The campaign pages and the library will fill the gaps.":"There is a lot more to his story. Start with the Biography page.";
    const missed=Q.qs.map((q,k)=>({q,k})).filter(({q,k})=>Q.picks[k]!==q.answer);
    const share=`I scored ${right}/${n} on the Lt Gen Sagat Singh quiz. Try it: ${location.href.split("#")[0]}`;
    el.innerHTML=`<h2>Your result</h2><div class="score">${right} / ${n}</div><p>${pct}%. ${verdict}</p>
    <div class="actions"><button class="btn" data-act="qStart">Take it again</button><a class="btn ghost" href="https://wa.me/?text=${encodeURIComponent(share)}" target="_blank" rel="noopener">Share on WhatsApp</a><button class="link" data-act="qClose">Choose another set</button></div>
    ${S.downloads?`<form id="certForm" class="inline-form" style="margin-top:.8rem"><input name="name" maxlength="60" required placeholder="Your name for the certificate" aria-label="Name for the certificate"><button class="btn small ghost" type="submit">Download certificate of participation</button></form><p class="meta">The certificate records participation and score. It is not a formal qualification.</p>`:""}
    ${missed.length?`<details style="margin-top:1rem"><summary style="cursor:pointer;font-weight:600">Review the ${missed.length} you missed</summary><ol class="review">${missed.map(({q,k})=>`<li value="${k+1}"><b>${esc(q.q)}</b><br>Correct answer: ${esc(q.options[q.answer])}${Q.picks[k]!=null?`. You chose: ${esc(q.options[Q.picks[k]])}`:""}${q.explain?`<div class="meta">${esc(q.explain)}</div>`:""}</li>`).join("")}</ol></details>`:""}`;
    return;
  }
  const q=Q.qs[Q.i],pick=Q.picks[Q.i],done=Q.teacher?Q.shown:pick!=null,camp=QTOPIC_CAMP[q.topic];
  el.innerHTML=`<div class="meta">Question ${Q.i+1} of ${n}${q.topic?` · ${esc(QTOPICS[q.topic]||q.topic)}`:""}${q.level?` · ${esc(QLEVELS[q.level]||q.level)}`:""}${Q.teacher?" · Teacher mode":""}</div>
  <div class="prog"><i style="width:${Q.i/n*100}%"></i></div><p class="q">${esc(q.q)}</p>
  <div class="choices">${q.options.map((o,j)=>`<button class="choice${done&&j===q.answer?" right":""}${!Q.teacher&&done&&j===pick&&pick!==q.answer?" wrong":""}" data-act="qPick" data-id="${j}" ${done||Q.teacher?"disabled":""}>${esc(o)}</button>`).join("")}</div>
  ${!done&&q.hint?(Q.hint?`<p class="meta" style="margin:.7rem 0 0;font-style:italic">Hint: ${esc(q.hint)}</p>`:`<button class="link" data-act="qHint" style="margin-top:.7rem">Show a hint</button>`):""}
  ${done?`<p style="margin:.8rem 0 0">${Q.teacher?"":`<b>${pick===q.answer?"Correct.":"Not quite."}</b> `}${esc(q.explain||"")}</p>${q.source?`<p class="meta">Source: ${esc(q.source)}</p>`:""}<p class="meta">Learn more: ${camp?`<a href="#campaigns" data-act="camp" data-id="${camp}">${esc(campName(camp))}</a>`:`<a href="#life">Biography</a>`}</p>`:""}
  <div class="actions">${Q.teacher&&!done?`<button class="btn" data-act="qReveal">Reveal the answer</button>`:""}${done?`<button class="btn" data-act="qNext">${Q.i+1<n?"Next question":Q.teacher?"Finish":"See my result"}</button>`:""}<button class="link" data-act="qClose">Quit</button></div>`;
}
async function certificate(name,right,n){
  const c=document.createElement("canvas");c.width=1600;c.height=1130;const g=c.getContext("2d");
  try{await document.fonts.ready}catch(e){}
  g.fillStyle="#F4F0E6";g.fillRect(0,0,1600,1130);g.strokeStyle="#762633";g.lineWidth=14;g.strokeRect(40,40,1520,1050);g.lineWidth=2;g.strokeRect(70,70,1460,990);
  g.fillStyle="#303B30";g.textAlign="center";g.font='600 40px "Big Shoulders Stencil Display", Impact, sans-serif';g.fillText("SAGAT SINGH RESEARCH FOUNDATION",800,190);
  g.fillStyle="#252A27";g.font='400 42px "Source Serif 4", Georgia, serif';g.fillText("Certificate of participation",800,300);
  g.fillStyle="#762633";g.font='800 110px "Big Shoulders Stencil Display", Impact, sans-serif';g.fillText(name,800,470);
  g.fillStyle="#252A27";g.font='400 38px "Source Serif 4", Georgia, serif';
  g.fillText("took part in the Lt Gen Sagat Singh quiz",800,580);g.fillText(`and answered ${right} of ${n} questions correctly`,800,640);
  g.font='400 32px "Source Serif 4", Georgia, serif';g.fillText(new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}),800,760);
  g.fillStyle="#5C625D";g.font='italic 400 26px "Source Serif 4", Georgia, serif';g.fillText("This certificate records participation. It is not a formal qualification.",800,960);
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));
  try{await S.downloads.save({filename:`ssrf-quiz-certificate.png`,data:blob});toast("Certificate saved")}catch(e){if(e&&e.code!=="declined")toast("The certificate couldn't be saved here")}
}
function quizManager(){
  const ed=Q.editing,q=ed==="new"?{options:["","","",""],answer:0,topic:"early",level:"intermediate"}:Q.all.find(x=>x.id===ed);
  return `<h3 class="sect">Question bank (editors)</h3><p class="meta">${Q.all.length} questions. Questions based on disputed or unverified anecdotes should say so in their explanation.</p>
  ${q?`<form class="panel" id="qForm" data-id="${esc(ed)}"><label for="qq">Question</label><textarea id="qq" name="q" required style="min-height:3rem">${esc(q.q)}</textarea>
    ${[0,1,2,3].map(i=>`<label for="qo${i}">Option ${"abcd"[i]}</label><input id="qo${i}" name="o${i}" value="${esc((q.options||[])[i])}"${i<2?" required":""}>`).join("")}
    <div class="grid2"><div><label for="qa">Correct option</label><select id="qa" name="answer">${[0,1,2,3].map(i=>`<option value="${i}"${q.answer===i?" selected":""}>${"abcd"[i]}</option>`).join("")}</select></div>
    <div><label for="qt">Topic</label><select id="qt" name="topic">${kopts(QTOPICS,q.topic)}</select></div><div><label for="ql">Level</label><select id="ql" name="level">${kopts(QLEVELS,q.level)}</select></div>
    <div><label for="qh">Hint</label><input id="qh" name="hint" value="${esc(q.hint)}"></div></div>
    <label for="qe">Explanation</label><textarea id="qe" name="explain" style="min-height:4rem">${esc(q.explain)}</textarea>
    <label for="qs">Source citation</label><input id="qs" name="source" value="${esc(q.source)}" placeholder="Author, title, page">
    <div class="actions"><button class="btn small" type="submit">Save question</button>${ed!=="new"?`<button class="link" type="button" data-act="qDel" data-id="${esc(ed)}">Delete</button>`:""}<button class="link" type="button" data-act="qEdit" data-id="">Cancel</button></div></form>`:`<p><button class="btn small ghost" data-act="qEdit" data-id="new">Add a question</button></p>`}
  <table class="plain"><thead><tr><th>#</th><th>Question</th><th>Topic</th><th>Level</th><th></th></tr></thead><tbody>${Q.all.map(x=>`<tr><td>${x.n||""}</td><td>${esc(x.q)}</td><td>${esc(QTOPICS[x.topic]||"")}</td><td>${esc(QLEVELS[x.level]||"")}</td><td><button class="link" data-act="qEdit" data-id="${esc(x.id)}">Edit</button></td></tr>`).join("")}</tbody></table>`;
}

/* ================= Writes ================= */
async function logDecision(action,target,title,reason,extra){try{await S.db.collection("revisions").add({action,target,title:title||"",reason:reason||"",by:S.uid,at:nowISO(),...(extra||{})})}catch(e){}}
async function submitSub(kind,data){
  const now=nowISO();
  if(S.resub){const x=mySubs().find(y=>y.id===S.resub);
    await S.db.doc(`subs/${S.uid}/items/${S.resub}`).update({data,status:"submitted",resubmittedAt:now,history:[...(x?.history||[]),{at:now,by:S.uid,status:"submitted",note:"Revised and resubmitted",prev:x?.data||{}}]});
    S.resub=null;return "Resubmitted for review";}
  await S.db.doc("subs/"+S.uid).set({at:now});
  await S.db.collection(`subs/${S.uid}/items`).add({kind,data,status:"submitted",createdAt:now,priority:"Normal",history:[{at:now,by:S.uid,status:"submitted"}]});
  return "Sent to the editors for review";
}
function nextArchiveId(cat){const p=ACAT[cat]||"IT",re=new RegExp(`^SSRF-${p}-(\\d+)$`);const max=S.archive.reduce((m,a)=>{const r=re.exec(a.id);return r?Math.max(m,+r[1]):m},0);return `SSRF-${p}-${String(max+1).padStart(5,"0")}`}
function authorNameFor(owner,attribution){const n=nameOf(owner);return attribution==="anonymous"?"A member":attribution==="initials"?initials(n):n}
async function publishSub(x,fd){
  const d={...(x.data||{})},now=nowISO(),camps=fd.getAll("camps"),base={authorId:x.owner,createdAt:x.createdAt,reviewedBy:S.uid,reviewedAt:now,fromSub:`${x.owner}/${x.id}`,camps};
  delete d.consent;let ref="";
  if(x.kind==="story"){const r=await S.db.collection("stories").add({...d,...base,assessment:fd.get("assessment")||"unverified",nature:fd.get("nature")||PROV_NATURE[d.prov]||"",authorName:authorNameFor(x.owner,d.attribution),status:"published"});ref="stories/"+r.id}
  if(x.kind==="book"){const r=await S.db.collection("books").add({...d,...base,nature:fd.get("nature")||d.nature||"",status:"checking"});ref="books/"+r.id}
  if(x.kind==="place"){const r=await S.db.collection("places").add({...d,...base,lat:d.lat?+d.lat:null,lng:d.lng?+d.lng:null,status:"checking"});ref="places/"+r.id}
  if(x.kind==="event"){const r=await S.db.collection("events").add({...d,...base});ref="events/"+r.id}
  if(x.kind==="archive"){const id=nextArchiveId(d.category),files=d.files||[];delete d.files;
    await S.db.doc("archive/"+id).set({...d,...base,nature:fd.get("nature")||"Primary source",authorName:authorNameFor(x.owner,"named"),status:"checking",pageCount:files.length,...(d.access==="Restricted"?{}:{files})});
    if(d.access==="Restricted"&&files.length)await S.db.doc("archiveFiles/"+id).set({files});ref="archive/"+id}
  return ref;
}
async function decide(form,d){
  const [owner,id]=form.dataset.sub.split("/"),x=(S.subs.get(owner)||[]).find(y=>y.id===id);if(!x)return;
  const fd=new FormData(form),note=String(fd.get("note")||"").trim(),coi=fd.get("coi")==="none",now=nowISO(),ref=S.db.doc(`subs/${owner}/items/${id}`),title=x.data?.title||x.data?.name||KINDLABEL[x.kind];
  const blk=coiBlock(x);if(blk&&d!=="coi"){toast(blk);return}
  if(d==="coi"){await ref.update({coi:[...(x.coi||[]),S.uid],assignee:x.assignee===S.uid?"":x.assignee||"",history:[...(x.history||[]),{at:now,by:S.uid,status:x.status,note:"A reviewer declared a conflict of interest and passed the item on"}]});await logDecision("Conflict of interest declared",`subs/${owner}/${id}`,title,note);toast("Recorded. Assign it to another editor.");render();return}
  const needsNote=["evidence","reject","decline","resolve","apply"].includes(d);
  if(needsNote&&!note){toast("Add a note or reason first");return}
  if(!coi){toast("Confirm you have no family, authorship or financial interest");return}
  const hist=(status,n)=>[...(x.history||[]),{at:now,by:S.uid,status,note:n||""}];
  if(d==="advance"){const next=STAGE_ORDER[STAGE_ORDER.indexOf(x.status)+1]||"approval";await ref.update({status:next,note,history:hist(next,note)});await logDecision("Moved to "+STAGES[next],`subs/${owner}/${id}`,title,note);toast("Moved to "+STAGES[next])}
  else if(d==="publish"){const where=await publishSub(x,fd);await ref.update({status:"published",note,publishedAs:where,reviewedBy:S.uid,reviewedAt:now,history:hist("published",note)});await logDecision("Published "+(KINDLABEL[x.kind]||x.kind).toLowerCase(),where,title,note);toast("Published")}
  else if(d==="evidence"){await ref.update({status:"evidence",note,history:hist("evidence",note)});await logDecision("Asked for evidence",`subs/${owner}/${id}`,title,note);toast("Sent back for evidence")}
  else if(d==="reject"||d==="decline"){await ref.update({status:"rejected",note,history:hist("rejected",note)});await logDecision(x.kind==="correction"?"Correction declined":"Not accepted",x.data?.target||`subs/${owner}/${id}`,title,note);toast("Recorded")}
  else if(d==="resolve"){await ref.update({status:"resolved",note,history:hist("resolved",note)});await logDecision("Correction resolved without change",x.data?.target,x.data?.title,note);toast("Resolved, with the reason recorded")}
  else if(d==="apply"){const tv=targetValue(x.data.target||"");if(!tv){toast("The entry was not found");return}
    const nv=String(fd.get("newText")||"");await applyEdit(tv,nv,note,`subs/${owner}/${id}`);
    await ref.update({status:"resolved",note,history:hist("resolved","Correction applied: "+note)});toast("Correction applied to the public text")}
  else if(d==="anonymise"||d==="deleteData"){
    for(const s of S.stories.filter(s=>s.authorId===owner))await S.db.doc("stories/"+s.id).update({authorName:"A member",attribution:"anonymous"});
    for(const a of S.archive.filter(a=>a.authorId===owner))await S.db.doc("archive/"+a.id).update({authorName:"A member"});
    if(d==="deleteData"){try{await S.db.doc("members/"+owner).delete()}catch(e){}try{await S.db.doc("memberPrivate/"+owner).delete()}catch(e){}}
    await ref.update({status:"resolved",note,history:hist("resolved",d==="deleteData"?"Profile deleted and contributions anonymised":"Contributions anonymised")});
    await logDecision(d==="deleteData"?"Personal data deleted":"Contributor anonymised","members/"+owner,"",note||"Member's request");toast("Done")}
  else if(d==="withdrawItem"){await S.db.doc(x.data.item).delete();await ref.update({status:"resolved",note,history:hist("resolved","Item unpublished")});await logDecision("Contribution withdrawn at member's request",x.data.item,"",note);toast("Unpublished")}
  else if(d==="complete"){await ref.update({status:"resolved",note,history:hist("resolved",note)});await logDecision("Request completed",`subs/${owner}/${id}`,title,note);toast("Marked completed")}
  render();
}
async function applyEdit(tv,newText,reason,via){
  let value=newText;
  if(tv.col==="campaigns"){const c=S.camps.find(x=>x.id===tv.id),cur=c[tv.field];
    if(Array.isArray(cur)){const ls=lines(newText);value=typeof cur[0]==="string"||!cur.length&&!/chronology|decisions/.test(tv.field)?ls:ls.map(l=>{const [a,b,s,m]=l.split("|").map(z=>z.trim());return tv.field==="decisions"?{d:a,c:b||"",s:s||""}:{d:a,e:b||"",s:s||"",...(/milestone/i.test(m||"")?{m:true}:{})}})}}
  const patch={[tv.field]:value};if(tv.col!=="campaigns")Object.assign(patch,{reviewedBy:S.uid,reviewedAt:nowISO()});
  await S.db.doc(`${tv.col}/${tv.id}`).update(patch);
  await logDecision(via?"Correction applied":"Edited",`${tv.col}/${tv.id}${tv.col==="campaigns"?"#"+tv.field:""}`,"",reason,{before:typeof tv.value==="string"?tv.value:JSON.stringify(tv.value),after:typeof value==="string"?value:lines(newText).join("\n"),via:via||""});
}

/* ================= Event handlers ================= */
document.addEventListener("change",async e=>{
  const t=e.target;
  if(t.dataset.f!==undefined){S.f[t.dataset.f]=t.value;S.limit={};render();return}
  if(t.dataset.upload){uploadMedia(t.dataset.upload,[...t.files],t.closest("form"));t.value="";return}
  if(t.dataset.verify){if(t.files[0])verifyBackup(t.files[0]);t.value="";return}
  if(t.dataset.act==="qTeacher"){Q.teacher=t.checked;return}
  if(t.dataset.act==="lver"){S.f.lver=t.checked?"1":"";render();return}
  if(t.dataset.act==="setAssess"){const s=S.stories.find(x=>x.id===t.dataset.id);if(ownWork(s)){toast("Another editor must assess your own story");return}
    try{await S.db.doc("stories/"+t.dataset.id).update({assessment:t.value,reviewedBy:S.uid,reviewedAt:nowISO()});await logDecision("Assessment set to "+ASSESS[t.value],"stories/"+t.dataset.id,s?.title,"");toast("Assessment updated")}catch(err){toast(errMsg(err))}}
});
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-act]");if(!b||b.tagName==="SELECT"||b.type==="checkbox")return;
  const id=b.dataset.id,act=b.dataset.act;
  const ui={
    form:()=>{S.form=S.form===id?null:id},cancelForm:()=>{S.form=null;S.resub=null},
    edit:()=>{S.edit=id;const k=id.split("#")[0];if(k.startsWith("claims/"))S.open.add(k)},cancelEdit:()=>{S.edit=null},
    correct:()=>{S.correcting=id},cancelCorr:()=>{S.correcting=null},
    toggle:()=>{S.open.has(id)?S.open.delete(id):S.open.add(id)},
    more:()=>{S.limit[id]=(S.limit[id]||20)+20},
    camp:()=>{S.camp=id;if(view()!=="campaigns")location.hash="#campaigns"},
    jump:()=>{setTimeout(()=>document.getElementById(id)?.scrollIntoView({block:"start",behavior:"smooth"}),220);if(b.getAttribute("href")&&view()!==b.getAttribute("href").slice(1))location.hash=b.getAttribute("href")},
    openStory:()=>{S.open.add(id);S.f.kind=S.f.era=S.f.assess=S.f.nature=S.f.camp="";S.limit.stories=1000;if(view()!=="stories")location.hash="#stories";setTimeout(()=>document.getElementById("story-"+id)?.scrollIntoView({block:"start"}),220)},
    researchMode:()=>{S.research=!S.research},
    openItem:()=>{S.item=id;S.page=0;S.zoom=1;S.panX=0;S.panY=0;S.docq="";if(view()!=="archive")location.hash="#archive";window.scrollTo(0,0)},
    closeItem:()=>{S.item=null},
    acoll:()=>{S.f.acoll=id;S.limit.archive=20},
    pf:()=>{const [k,val]=id.split("|");S.f[k]=val;if(k==="pstate")S.f.ploc=""},ploc:()=>{S.f.ploc=id;const p=S.places.find(x=>(x.city||x.location)===id||pKey(x)===id);S.f.pstate=id&&p?p.state:S.f.pstate;setTimeout(()=>document.querySelector(".rfilters")?.scrollIntoView({block:"start",behavior:"smooth"}),60)},pclear:()=>{S.f.pstate="";S.f.ploc="";S.f.pkind="";S.f.pst=""},
    lvl:()=>{S.f.lvl=id},lquiz:()=>{Q.set=id;Q.on=false;setTimeout(()=>document.getElementById("quiz-h")?.scrollIntoView({block:"start",behavior:"smooth"}),50)},
    chmembers:()=>{S.f.chapter=id;S.f.mgrp=""},
    mgrp:()=>{S.f.mgrp=id},mclear:()=>{S.f.mgrp="";S.f.chapter=""},
    snat:()=>{S.f.nature=id},sclear:()=>{S.f.nature="";S.f.sq=""},
    lgrp:()=>{S.f.lgrp=id},lclear:()=>{S.f.lq="";S.f.lgrp="";S.f.camp="";S.f.lver=""},
    atype:()=>{S.f.atype=id;S.limit.archive=20},aclear:()=>{S.f.atype="";S.f.acoll=""},
    zoom:()=>{const z=S.zoom||1;if(id==="reset"){S.zoom=1;S.panX=0;S.panY=0}else S.zoom=Math.min(6,Math.max(1,+(id==="in"?z*1.5:z/1.5).toFixed(2)));if(S.zoom===1){S.panX=0;S.panY=0}},
    fullscreen:()=>{const el=document.getElementById("vw");if(!el)return;if(document.fullscreenElement)document.exitFullscreen?.();else el.requestFullscreen?.().catch(()=>toast("Full screen isn't available here"))},
    pg:()=>{S.page=Math.max(0,S.page+(+id));S.zoom=1;S.panX=0;S.panY=0},
    resub:()=>{S.resub=id;window.scrollTo(0,0)},
    probe:()=>{probeAccess()},
    copyCite:()=>{const el=document.getElementById(id);if(!el)return;navigator.clipboard?.writeText(el.textContent).then(()=>toast("Citation copied"),()=>{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);toast("Citation selected; copy it with your keyboard")})},
    qSet:()=>{Q.set=id},qStart:()=>{Q.qs=quizSet(Q.set);Q.on=true;Q.i=0;Q.picks=[];Q.hint=false;Q.shown=false;setTimeout(()=>$("#quiz")?.scrollIntoView({block:"start"}),0)},
    qPick:()=>{if(Q.picks[Q.i]==null)Q.picks[Q.i]=+id},qHint:()=>{Q.hint=true},qReveal:()=>{Q.shown=true},
    qNext:()=>{Q.i++;Q.hint=false;Q.shown=false;setTimeout(()=>$("#quiz")?.scrollIntoView({block:"start"}),0)},qClose:()=>{Q.on=false},qEdit:()=>{Q.editing=id||null},
    restoreMissing:()=>{restoreMissing()},backupJson:()=>{backupJson()},backupCsv:()=>{backupCsv()},backupMedia:()=>{backupMedia()}
  };
  if(ui[act]){if(b.tagName==="A"&&!["jump","camp","openStory","openItem"].includes(act))e.preventDefault();if(b.tagName==="A"&&act==="camp"&&view()==="campaigns")e.preventDefault();ui[act]();if(!["probe","restoreMissing","backupJson","backupCsv","backupMedia"].includes(act))render();return}
  if(!S.db)return;
  b.disabled=true;
  try{
    if(act==="salute"){const mine=S.salutes.get(S.uid)||[];await S.db.doc("salutes/"+S.uid).set({sids:mine.includes(id)?mine.filter(x=>x!==id):[...mine,id]})}
    if(act==="attend"){const mine=S.attend.get(S.uid)||[],on=mine.includes(id);await S.db.doc("attend/"+S.uid).set({eids:on?mine.filter(x=>x!==id):[...mine,id]});toast(on?"Registration cancelled":"You're registered")}
    if(act==="delMedia"&&confirm("Remove this item from the event?")){const owner=b.dataset.owner,m=(S.media.get(owner)||[]).find(x=>x.id===id);if(m&&m.assetId&&S.assets){try{await S.assets.delete(m.assetId)}catch(err){}}await S.db.doc(`media/${owner}/items/${id}`).delete();toast("Removed")}
    if(act==="del"&&confirm("Delete this entry? It can be restored only from a backup.")){const col=b.dataset.col,r=[...S.books,...S.places,...S.events].find(x=>x.id===id);await S.db.doc(col+"/"+id).delete();await logDecision("Deleted from "+col,col+"/"+id,r?.title||r?.name,"");toast("Deleted")}
    if(act==="unpublish"&&confirm("Unpublish this story? The contributor's submission and its history remain.")){const s=S.stories.find(x=>x.id===id);await S.db.doc("stories/"+id).delete();await logDecision("Unpublished story","stories/"+id,s?.title,"");toast("Unpublished")}
    if(act==="withdrawSub"&&confirm("Withdraw this contribution from review?")){const x=mySubs().find(y=>y.id===id);await S.db.doc(`subs/${S.uid}/items/${id}`).update({status:"withdrawn",history:[...(x?.history||[]),{at:nowISO(),by:S.uid,status:"withdrawn"}]});toast("Withdrawn")}
    if(act==="removePortrait"&&confirm("Remove the portrait from the home page? The archive copy, if any, stays.")){await S.db.doc("site/portrait").delete();await logDecision("Home page portrait removed","site/portrait","","");toast("Portrait removed")}
    if(act==="qDel"&&confirm("Delete this question?")){await S.db.doc("quiz/"+id).delete();await logDecision("Quiz question deleted","quiz/"+id,"","");Q.editing=null;toast("Deleted")}
    if(act==="leave"&&confirm("Remove your profile now? Your salutes and registrations are deleted too. Your past contributions stay until you ask for anonymisation.")){
      for(const p of ["members","memberPrivate","salutes","attend"]){try{await S.db.doc(`${p}/${S.uid}`).delete()}catch(err){}}S.myPriv=null;toast("Profile removed")}
  }catch(err){toast(errMsg(err))}finally{b.disabled=false;render()}
});
document.addEventListener("submit",async e=>{
  e.preventDefault();const f=e.target,fd=new FormData(f),d={};for(const [k,v] of fd.entries())if(k!=="camps"&&k!=="files")d[k]=String(v).trim();
  if(f.id==="hsearch"||f.id==="searchForm"){S.f.q=d.q||"";if(view()!=="search")location.hash="#search";else render();setTimeout(()=>{const i=$("#q");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},30);return}
  if(f.id==="docSearch"){S.docq=d.q||"";render();return}
  if(f.id==="libSearch"){S.f.lq=d.q||"";render();return}
  if(f.id==="srcSearch"){S.f.sq=d.q||"";render();return}
  if(f.id==="certForm"){const right=Q.picks.filter((p,k)=>p===Q.qs[k].answer).length;certificate(d.name,right,Q.qs.length);return}
  const btn=e.submitter||f.querySelector('[type="submit"],button:not([type])');if(btn)btn.disabled=true;
  const now=nowISO(),camps=fd.getAll("camps");
  try{
    if(f.classList.contains("decide")){await decide(f,e.submitter?.value);return}
    if(f.classList.contains("assign")){const [owner,id]=f.dataset.sub.split("/"),x=(S.subs.get(owner)||[]).find(y=>y.id===id);const patch={assignee:d.assignee||"",due:d.due||"",priority:d.priority||"Normal"};if(d.stage&&d.stage!==x.status&&x.status!=="evidence"){patch.status=d.stage;patch.history=[...(x.history||[]),{at:now,by:S.uid,status:d.stage,note:"Stage set"}]}
      await S.db.doc(`subs/${owner}/items/${id}`).update(patch);await logDecision("Assignment updated",`subs/${owner}/${id}`,x.data?.title||x.data?.name,`${d.assignee?"To "+nameOf(d.assignee):"Unassigned"}${d.due?", due "+d.due:""}, ${d.priority} priority`);toast("Assignment saved");return}
    if(f.id==="joinForm"){
      const prev=me()||{};let photo=d.photoRemove?"":(prev.photo||"");
      const pf=f.querySelector('input[name="photo"]')?.files?.[0];
      if(pf&&!d.photoRemove){if(!d.photoConsent){toast("Tick the consent box to add a photograph");return}if(pf.size>5*1024*1024){toast("Please use a photograph under 5 MB");return}if(!S.assets){toast("Photographs can't be uploaded here");return}try{toast("Uploading photograph…");const a=await S.assets.upload(pf);photo=a.url}catch(err){toast("The photograph didn't upload");return}}
      const prof={name:d.name,title:d.title||"",affiliation:d.affiliation||"",category:d.category,chapter:d.chapter,connection:d.connection,interests:d.interests,camps,listed:!!d.listed,showChapter:!!d.showChapter,showContrib:!!d.showContrib,photo,photoConsent:!!d.photoConsent&&!!photo,adult:true,joinedAt:prev.joinedAt||now};
      await S.db.doc("memberPrivate/"+S.uid).set(prof);S.myPriv=prof;
      if(prof.listed)await S.db.doc("members/"+S.uid).set({name:prof.name,title:prof.title,affiliation:prof.affiliation,category:prof.category,chapter:prof.showChapter?prof.chapter:"",showChapter:prof.showChapter,connection:prof.connection,interests:prof.interests,camps,showContrib:prof.showContrib,joinedAt:prof.joinedAt,photo:prof.photoConsent?prof.photo:"",photoConsent:prof.photoConsent});
      else{try{await S.db.doc("members/"+S.uid).delete()}catch(err){}}
      toast(prev.name?"Profile saved":"Welcome. You're a member.");render();return}
    const kinds={storyForm:"story",bookForm:"book",placeForm:"place",eventForm:"event",archiveForm:"archive"};
    if(kinds[f.id]){
      const kind=kinds[f.id];
      for(const u of [d.video,d.link,d.source])if(!httpsOk(u)){toast("Links must start with https://");return}
      if(kind==="place"&&((d.lat&&isNaN(+d.lat))||(d.lng&&isNaN(+d.lng)))){toast("Latitude and longitude must be numbers");return}
      const data={...d,camps};delete data.consent;if(kind==="story")data.editOk=!!d.editOk,data.consent=true;
      if(kind==="archive"){
        const prior=S.resub?(mySubs().find(y=>y.id===S.resub)?.data?.files||[]):[];data.files=[...prior];
        const files=[...(f.querySelector('input[type="file"]')?.files||[])];
        for(const file of files){if(file.size>20*1024*1024){toast(`${file.name} is over 20 MB and was skipped`);continue}
          S.uploading++;toast(`Uploading ${file.name}…`);try{const buf=await file.arrayBuffer(),sum=await sha256(buf),a=await S.assets.upload(file);data.files.push({assetId:a.id,url:a.url,name:file.name,type:file.type,size:file.size,sha256:sum})}catch(err){toast(`${file.name} didn't upload`)}finally{S.uploading--}}
        data.consent=true;
        if(S.isAdmin&&!S.resub){const id=nextArchiveId(data.category),fl=data.files;delete data.files;
          await S.db.doc("archive/"+id).set({...data,authorId:S.uid,authorName:nameOf(S.uid),createdAt:now,status:"checking",nature:"Primary source",pageCount:fl.length,reviewedBy:"",verNote:"Catalogued; awaiting verification by a second editor",...(data.access==="Restricted"?{}:{files:fl})});
          if(data.access==="Restricted"&&fl.length)await S.db.doc("archiveFiles/"+id).set({files:fl});
          await logDecision("Catalogued archive item","archive/"+id,data.title,"");S.form=null;toast(`Catalogued as ${id}`);render();return}
      }
      if(kind==="event"&&S.isAdmin&&!S.resub){await S.db.collection("events").add({...data,authorId:S.uid,createdAt:now});await logDecision("Added event","events",data.title,"");S.form=null;toast(data.date<todayISO()?"Saved under past events":"Saved under upcoming events");render();return}
      const msg=await submitSub(kind,data);S.form=null;toast(msg);render();return}
    if(f.id==="portraitForm"){
      const file=f.elements.file.files[0],prev=S.site.portrait||{};let fileRec=null;
      if(file){if(!/^image\//.test(file.type)){toast("Choose an image file");return}if(file.size>20*1024*1024){toast("The photo is over 20 MB");return}
        if(!S.assets){toast("Uploading isn't available in this view");return}
        toast("Uploading the photograph…");const buf=await file.arrayBuffer(),sum=await sha256(buf),a=await S.assets.upload(file);fileRec={assetId:a.id,url:a.url,name:file.name,type:file.type,size:file.size,sha256:sum}}
      const rec={...prev,caption:d.caption,credit:d.credit,rights:d.rights,donor:d.donor,approxDate:d.approxDate,by:S.uid,at:now,...(fileRec?{assetId:fileRec.assetId,url:fileRec.url,sha256:fileRec.sha256}:{})};
      if(fileRec&&d.archive){const id=nextArchiveId("Photograph");
        await S.db.doc("archive/"+id).set({title:d.caption,category:"Photograph",collection:"Sagat Singh Personal Archive",approxDate:d.approxDate,location:"",creator:d.credit,originalOwner:"",donor:d.donor,rights:d.rights,access:"Public",download:"Not allowed",people:"Lt Gen Sagat Singh",units:"",camps:[],description:"Portrait used on the foundation's home page.",nature:"Primary source",files:[fileRec],pageCount:1,authorId:S.uid,authorName:nameOf(S.uid),createdAt:now,status:"checking",verNote:"Catalogued; awaiting verification by a second editor"});
        rec.archiveId=id;await logDecision("Catalogued archive item","archive/"+id,d.caption,"Home page portrait")}
      await S.db.doc("site/portrait").set(rec);await logDecision(prev.url?"Home page portrait updated":"Home page portrait added","site/portrait",d.caption,`Credit: ${d.credit}. Rights: ${d.rights}`);
      S.form=null;toast("Portrait saved");render();return}
    if(f.id==="corrForm"){await submitSub("correction",{target:f.dataset.target,title:f.dataset.title,text:d.text,source:d.source});S.correcting=null;toast("Thank you. The editors will review your correction.");render();return}
    if(f.id==="privacyForm"){await submitSub("privacy",{type:d.type,item:d.item,detail:d.detail});S.form=null;toast("Request sent. Editors respond within 30 days.");render();return}
    if(f.id==="accessForm"){await submitSub("access",{item:f.dataset.id,title:f.dataset.title,purpose:d.purpose});S.form=null;toast("Access requested");render();return}
    if(f.id==="statusForm"){const col=f.dataset.col,arr={places:S.places,books:S.books,archive:S.archive}[col],r=arr.find(x=>x.id===f.dataset.id);if(ownWork(r)){toast("Another editor must verify your own entry");return}
      await S.db.doc(`${col}/${f.dataset.id}`).update({status:d.status,verified:d.status==="verified",verNote:d.verNote,reviewedBy:S.uid,reviewedAt:now});
      await logDecision("Status set to "+VSTAT[d.status],`${col}/${f.dataset.id}`,r?.title||r?.name,d.verNote);S.edit=null;toast("Status saved");render();return}
    if(f.id==="claimForm"){const c=S.claims.find(x=>x.id===f.dataset.id),cites=lines(d.cites).map(l=>{const [s,...rest]=l.split("|");return {s:s.trim(),loc:rest.join("|").trim()}});
      const bad=cites.filter(x=>!S.sources.has(x.s));if(bad.length){toast(`Unknown source id: ${bad.map(x=>x.s).join(", ")}`);return}
      const patch={heading:d.heading,year:d.year,text:d.text,assessment:d.assessment,status:d.status,established:d.established,unresolved:d.unresolved,cites,reviewedBy:S.uid,reviewedAt:now};
      await S.db.doc("claims/"+c.id).update(patch);await logDecision("Edited","claims/"+c.id,c.heading,d.reason,{before:`${c.text} [${ASSESS[c.assessment]}]`,after:`${d.text} [${ASSESS[d.assessment]}]`});S.edit=null;toast("Revision saved");render();return}
    if(f.id==="campForm"){const tv=targetValue(`campaigns/${f.dataset.id}#${f.dataset.field}`);await applyEdit(tv,d.value,d.reason);
      if(f.dataset.kind==="text")await S.db.doc("campaigns/"+f.dataset.id).update({[f.dataset.field+"Cites"]:String(d.cites||"").split(",").map(s=>s.trim()).filter(Boolean)});S.edit=null;toast("Revision saved");render();return}
    if(f.id==="entityForm"){const en=S.entities.find(x=>x.id===f.dataset.id);await S.db.doc("entities/"+en.id).update({role:d.role,cites:String(d.cites||"").split(",").map(s=>s.trim()).filter(Boolean)});await logDecision("Edited","entities/"+en.id,en.name,d.reason,{before:en.role,after:d.role});S.edit=null;toast("Revision saved");render();return}
    if(f.id==="transForm"){const a=S.archive.find(x=>x.id===f.dataset.id);await S.db.doc("archive/"+a.id).update({transcript:fd.get("transcript")});await logDecision("Transcript edited","archive/"+a.id,a.title,d.reason);S.edit=null;toast("Transcript saved");render();return}
    if(f.id==="chapterForm"){await S.db.doc("chapters/"+f.dataset.id).update({purpose:lines(d.purpose),coordinator:d.coordinator||"",active:!!d.active});await logDecision("Chapter updated","chapters/"+f.dataset.id,f.dataset.id,"");S.edit=null;toast("Chapter saved");render();return}
    if(f.id==="settingsForm"){await S.db.doc("site/settings").set({...(S.site.settings||{}),...d});await logDecision("Governance and contact updated","site/settings","","");S.edit=null;toast("Saved");render();return}
    if(f.id==="sourceForm"){const {id,...rest}=d;if(S.sources.has(id)){toast("That id is taken");return}if(!httpsOk(rest.url)&&!/^http:\/\//i.test(rest.url||"")){toast("Links must start with https://");return}await S.db.doc("sources/"+id).set(rest);await logDecision("Source added","sources/"+id,rest.title,"");S.form=null;toast("Source added");render();return}
    if(f.id==="reportForm"){const ev=S.events.find(x=>x.id===f.dataset.id);if(!httpsOk(d.recording)){toast("Links must start with https://");return}await S.db.doc("events/"+ev.id).update({summary:d.summary,proceedings:d.proceedings,attendance:d.attendance,recording:d.recording,outcomes:d.outcomes,press:d.press});await logDecision("Event report saved","events/"+ev.id,ev.title,"");S.edit=null;toast("Report saved");render();return}
    if(f.id==="qForm"){const ed=f.dataset.id,options=[0,1,2,3].map(i=>d["o"+i]).filter(Boolean),ans=+d.answer;if(ans>=options.length){toast("The correct option must be one that is filled in");return}
      const data={q:d.q,options,answer:ans,explain:d.explain,hint:d.hint,source:d.source,topic:d.topic,level:d.level};
      if(ed==="new"){const n=Math.max(0,...Q.all.map(x=>x.n||0))+1;await S.db.doc("quiz/q"+String(n).padStart(2,"0")).set({...data,n});await logDecision("Quiz question added","quiz/q"+n,d.q.slice(0,80),"")}
      else{await S.db.doc("quiz/"+ed).update(data);await logDecision("Quiz question edited","quiz/"+ed,d.q.slice(0,80),"")}
      Q.editing=null;toast("Question saved");render();return}
    if(f.id==="mediaForm"){if(!d.url){toast("Paste a video link, or use Upload for files");return}if(!httpsOk(d.url)){toast("Links must start with https://");return}
      await S.db.doc("media/"+S.uid).set({at:now});await S.db.collection(`media/${S.uid}/items`).add({eid:f.dataset.id,kind:"link",url:d.url,caption:d.caption||(/youtu/i.test(d.url)?"Watch on YouTube":"Watch the video"),credit:d.credit,createdAt:now});f.reset();toast("Video link added");return}
  }catch(err){toast(errMsg(err))}finally{if(btn)btn.disabled=false}
});
async function uploadMedia(eid,files,form){
  if(!S.assets){toast("Uploading isn't open to this account");return}
  const caption=form?.elements?.caption?.value.trim()||"",credit=form?.elements?.credit?.value.trim()||"";
  if(!credit){toast("Add the photographer or source first, so the credit stays with the file");return}
  await S.db.doc("media/"+S.uid).set({at:nowISO()});
  for(const file of files){
    const kind=file.type.startsWith("video/")?"video":file.type.startsWith("image/")?"image":null;
    if(!kind){toast(`${file.name} isn't a photo or video`);continue}
    if(file.size>20*1024*1024){toast(`${file.name} is over 20 MB. Upload it to YouTube and add the link instead.`);continue}
    S.uploading++;render();
    try{const buf=await file.arrayBuffer(),sum=await sha256(buf),a=await S.assets.upload(file);
      await S.db.collection(`media/${S.uid}/items`).add({eid,kind,assetId:a.id,url:a.url,name:file.name,caption,credit,size:file.size,type:file.type,sha256:sum,createdAt:nowISO()})}
    catch(err){toast(`${file.name} didn't upload. Try again.`)}finally{S.uploading--;render()}
  }
}

/* ================= Start ================= */
(async function init(){
  render();
  if(!window.claude||!window.claude.use){S.offline=true;useSnapshot();render();return}
  S.timer=setTimeout(()=>{S.slow=true;render()},10000);
  const [db,user,assets,downloads]=await Promise.all([claude.use("db"),claude.use("user"),claude.use("assets"),claude.use("downloads")]);
  S.db=db;S.user=user;S.assets=assets;S.downloads=downloads;
  if(!db){S.offline=true;clearTimeout(S.timer);useSnapshot();render();return}
  if(user){
    try{S.uid=await user.id()}catch(e){}
    try{S.can=await user.can("data.write")}catch(e){S.can=null}
    try{S.isAdmin=!!((await user.isOwner())||(await user.canEdit()))}catch(e){}
  }
  S.access=!S.uid?"no":S.can===true?"ok":S.can===false?"no":"unknown";
  render();
})();

(()=>{let drag=null;
  const apply=()=>{const im=document.getElementById("zoomimg");if(im)im.style.transform=`translate(${S.panX||0}px,${S.panY||0}px) scale(${S.zoom||1})`;const zl=document.querySelector(".vw-tools .vz");if(zl&&/%$/.test(zl.textContent))zl.textContent=Math.round((S.zoom||1)*100)+"%"};
  document.addEventListener("pointerdown",e=>{if(e.target.id!=="zoomimg"||(S.zoom||1)<=1)return;drag={x:e.clientX-(S.panX||0),y:e.clientY-(S.panY||0)};e.target.setPointerCapture?.(e.pointerId);e.preventDefault()});
  document.addEventListener("pointermove",e=>{if(!drag)return;S.panX=e.clientX-drag.x;S.panY=e.clientY-drag.y;apply()});
  document.addEventListener("pointerup",()=>{drag=null});
  document.addEventListener("wheel",e=>{if(!e.target.closest||!e.target.closest(".zoomwrap"))return;e.preventDefault();const z=S.zoom||1;S.zoom=Math.min(6,Math.max(1,+(e.deltaY<0?z*1.15:z/1.15).toFixed(2)));if(S.zoom===1){S.panX=0;S.panY=0}apply()},{passive:false});
})();

document.addEventListener("error",e=>{const t=e.target;if(!t||!t.classList||!t.classList.contains("lcov-img"))return;const alt=(t.dataset.alt||"").split("|").filter(Boolean);if(alt.length){t.dataset.alt=alt.slice(1).join("|");t.src=alt[0]}else t.remove()},true);
document.addEventListener("load",e=>{const t=e.target;if(t&&t.classList&&t.classList.contains("lcov-img")&&t.naturalWidth<=2)t.remove()},true);
