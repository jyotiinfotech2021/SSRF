/* ================= Reference data ================= */
const ASSESS={documented:"Documented",corroborated:"Confirmed by several sources",attributed:"Single source",unverified:"Unconfirmed account",disputed:"Sources differ"};
const WEAK=new Set(["attributed","unverified","disputed"]);
const settled=c=>c.status==="settled"||c.status==="resolved";
const ASSESS_HELP={documented:"Supported by identifiable documentary evidence",corroborated:"Supported by independent sources",attributed:"Clearly attributed, not independently confirmed",unverified:"Insufficient evidence so far",disputed:"Credible sources give materially different accounts"};
const NATURE=["Primary source","Oral history","Family testimony","Secondary research","Tertiary source"];
const NATURE_HELP={"Primary source":"Contemporary document, official record, photograph, letter or order","Oral history":"Recorded or transcribed first-hand testimony","Family testimony":"An account passed on by a family member","Secondary research":"Historical analysis by a researcher or journalist","Tertiary source":"Encyclopaedia, general reference or compilation"};
const VSTAT={submitted:"Submitted",checking:"Under verification",evidence:"Evidence requested",verified:"Verified",rejected:"Rejected",recheck:"Needs re-verification"};
const STAGES={submitted:"Submitted",screening:"Initial screening",research:"Research review",factcheck:"Fact-check",approval:"Editorial approval",evidence:"Evidence requested",published:"Published",rejected:"Not accepted",resolved:"Resolved",withdrawn:"Withdrawn"};
const STAGE_ORDER=["submitted","screening","research","factcheck","approval"];
const CATEGORIES=["Founding member","Veteran member","Family and legacy member","Research member","Academic member","Student member","Institutional member","Volunteer member","Patron or supporter"];
const KINDS=["Article","Memoir","Anecdote","Video"];
const ERAS=["Early life and Bikaner","Goa 1961","Nathu La 1967","Mizo Hills","1971 war","Later years","Legacy today"];
const PROV_NATURE={first:"Oral history",family:"Family testimony",research:"Secondary research"};
const PROV_ASSESS={first:"attributed",family:"attributed",research:"unverified"};
const BKINDS=["Biography","Book","Article","Official record","Memoir","Thesis","Newspaper","Documentary or video","Lecture or talk","Other"];
const PKINDS=["Statue","Bust","Named after him","Memorial","Observance","Honour","Museum or display","Proposal","Other"];
const ETYPES=["Commemorative","Research","Public engagement"];
const ACAT={Photograph:"PH",Document:"DO",Letter:"LE",Map:"MA","Audio-video":"AV",Newspaper:"NP","Oral history":"OH"};
const ACOLL=["Sagat Singh Personal Archive","Bikaner Ganga Risala Collection","Goa Liberation Collection","Nathu La and Cho La Collection","1971 War Collection","Oral History Collection","Family Photographs Collection","Military Documents Collection"];
const RIGHTS=["I own the rights","The rights holder has given permission","Public domain","Rights unknown"];
const QTOPICS={early:"Early life",goa:"Goa 1961",nathula:"Nathu La","1971":"Mizo Hills and 1971",legacy:"Legacy"};
const QLEVELS={beginner:"Beginner",intermediate:"Intermediate",advanced:"Advanced"};
const QTOPIC_CAMP={goa:"goa",nathula:"nathula","1971":"meghna"};
const FALLBACK_CHAPTERS=["Goa","Rajasthan","Delhi NCR","Pune and Mumbai","Bengaluru","Northeast","Overseas"];
const GROUPS=[["history","Explore history",["life","campaigns","people"]],["research","Research and archives",["archive","library","videos","sources"]],["community","Community",["stories","members","chapters"]],["learn","Learning",["learn"]],["events","Events and recognition",["events","recognition"]],["about","About SSRF",["about","account"]]];
const LABEL={home:"Home",life:"Biography",campaigns:"Campaigns",people:"People and units",archive:"Digital archive",library:"Library",videos:"Videos",sources:"Sources",stories:"Stories",members:"Members",chapters:"Chapters",learn:"Learning Centre",events:"Events",recognition:"Recognition register",about:"About",account:"Join",search:"Search",review:"Review"};
const ALIAS={join:"account",places:"recognition",timeline:"life",profile:"account"};
const VIEWS=["home","life","campaigns","people","archive","library","videos","sources","stories","members","chapters","learn","events","recognition","about","account","search","review"];
const EDITABLE={claims:"text",stories:"body",books:"description",places:"description",events:"description",archive:"description",entities:"role"};
const SNAP=__SNAPSHOT__;

/* ================= State ================= */
const S={db:null,user:null,uid:null,can:null,access:"unknown",isAdmin:false,assets:null,downloads:null,offline:false,slow:false,
  claims:[],camps:[],sources:new Map(),entities:[],chapters:[],stories:[],books:[],places:[],events:[],archive:[],revisions:[],site:{},
  members:new Map(),priv:new Map(),myPriv:null,subs:new Map(),media:new Map(),salutes:new Map(),attend:new Map(),archFiles:new Map(),
  ready:{},f:{q:"",kind:"",era:"",assess:"",nature:"",camp:"",bkind:"",pkind:"",pstate:"",etype:"",cat:"",chapter:"",acoll:"",stype:"",scamp:"",sassess:"",rq:"all",acoll:""},
  limit:{},open:new Set(),form:null,edit:null,correcting:null,resub:null,camp:"goa",item:null,page:0,docq:"",uploading:0,busy:""};
const unsub=new Map();

/* ================= Helpers ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const opts=(arr,sel,blank)=>(blank!=null?`<option value="">${esc(blank)}</option>`:"")+arr.map(v=>`<option${v===sel?" selected":""}>${esc(v)}</option>`).join("");
const kopts=(obj,sel,blank)=>(blank!=null?`<option value="">${esc(blank)}</option>`:"")+Object.entries(obj).map(([k,v])=>`<option value="${esc(k)}"${k===sel?" selected":""}>${esc(v)}</option>`).join("");
const fmtDate=iso=>{if(!iso)return"";try{return new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}catch(e){return""}};
const fmtDay=d=>{try{return new Date(d+"T00:00:00").toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"long",year:"numeric"})}catch(e){return d}};
const todayISO=()=>new Date().toLocaleDateString("en-CA");
const nowISO=()=>new Date().toISOString();
const daysSince=iso=>iso?Math.floor((Date.now()-new Date(iso).getTime())/864e5):0;
const daysUntil=d=>d?Math.ceil((new Date(d+"T23:59:59").getTime()-Date.now())/864e5):null;
const httpsOk=u=>!u||/^https:\/\//i.test(u);
const initials=n=>String(n||"?").split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();
const hue=id=>{let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))%360;return h};
const lines=s=>String(s||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);
const campName=id=>(S.camps.find(c=>c.id===id)||{}).name||id;
const nameOf=id=>id==="ssrf"?"Sagat Singh Research Foundation":(S.priv.get(id)?.name||S.members.get(id)?.name||(id===S.uid&&S.myPriv?.name)||"A member");
const me=()=>S.uid?(S.myPriv||S.priv.get(S.uid)||null):null;
const ownWork=r=>!!(r&&r.authorId&&r.authorId===S.uid);
const canPost=()=>S.access==="ok"&&!!S.uid&&!!S.db;
const allMedia=()=>[...S.media.values()].flat();
const allSubs=()=>[...S.subs.values()].flat();
const mySubs=()=>S.uid?(S.subs.get(S.uid)||[]):[];
const assessTag=k=>k&&ASSESS[k]?`<span class="tag as-${k}" title="${esc(ASSESS_HELP[k])}">${esc(ASSESS[k])}</span>`:"";
const natureTag=n=>n?`<span class="tag nat" title="${esc(NATURE_HELP[n]||"")}">${esc(n)}</span>`:"";
const vTag=st=>`<span class="tag st-${st||"submitted"}">${esc(VSTAT[st||"submitted"])}</span>`;
const editorialTag=`<span class="tag ed">SSRF editorial</span>`;
const memberTag=`<span class="tag mc">Member contribution</span>`;
function toast(msg){const t=$("#toast");t.textContent=msg;t.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display="none",3800)}
function errMsg(e){
  if(e&&e.code==="quota_exceeded")return "Storage is full. Ask the foundation to clear old entries.";
  if(e&&e.code==="invalid_argument")return "Your access level doesn't allow that.";
  return "That didn't save. Check your connection and try again.";
}
function citeText(c){
  const s=S.sources.get(c.s);if(!s)return esc(c.s);
  return `${esc(s.author)}, <i>${esc(s.title)}</i>${s.publisher&&s.publisher!==s.author?`, ${esc(s.publisher)}`:""}${s.date&&s.date!=="Not stated"?`, ${esc(s.date)}`:""}.${c.loc?` At: ${esc(c.loc)}.`:""} ${esc(s.nature)}. ${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">Open</a>, accessed ${esc(s.accessed)}.`:""}`;
}
const srcRank=k=>{const s=S.sources.get(k);if(k==="book")return 0;if(/^wiki/i.test(k)||/wikipedia/i.test(s?.publisher||s?.author||""))return 5;return {"Primary source":1,"Secondary research":2,"Oral history":2,"Family testimony":2,"Tertiary source":4}[s?.nature]??3};
const NEG=/incorrect|error|do not include/i;
const rankCites=cs=>(cs||[]).filter(c=>(S.isAdmin&&S.research)||!NEG.test(c.loc||"")).map((c,i)=>[c,i]).sort((a,b)=>(NEG.test(a[0].loc||"")-NEG.test(b[0].loc||""))||(srcRank(a[0].s)-srcRank(b[0].s))||(a[1]-b[1])).map(x=>x[0]);
const rankKeys=ks=>[...(ks||[])].map((k,i)=>[k,i]).sort((a,b)=>(srcRank(a[0])-srcRank(b[0]))||(a[1]-b[1])).map(x=>x[0]);
const citeList=cs0=>{const cs=rankCites(cs0);return cs.length?`<ol class="cites">${cs.map(c=>`<li>${citeText(c)}</li>`).join("")}</ol>`:`<p class="meta nosrc">No source attached yet.</p>`};
const shortCite=keys0=>{const keys=rankKeys(keys0);return keys.length?keys.map(k=>{const s=S.sources.get(k);return s?`<a href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.title)}">${esc(s.author)}</a>`:esc(k)}).join(" · "):`<span class="nosrc">No source attached yet</span>`};
function historyFor(target){return S.revisions.filter(r=>r.target===target).sort((a,b)=>String(b.at).localeCompare(String(a.at)))}
function historyPanel(target){
  const h=historyFor(target);if(!h.length)return"";
  return `<details class="hist"><summary>Revised ${h.length} ${h.length===1?"time":"times"}, last on ${fmtDate(h[0].at)}</summary><ol>${h.map(r=>`<li><b>${fmtDate(r.at)}</b>, ${esc(nameOf(r.by))}: ${esc(r.action)}${r.reason?`. Reason: ${esc(r.reason)}`:""}${r.before!=null?`<div class="diff"><div><span>Before</span>${esc(r.before)}</div><div><span>After</span>${esc(r.after)}</div></div>`:""}</li>`).join("")}</ol></details>`;
}
function correctionLink(target,title){
  if(S.correcting===target)return `<form class="panel inline" id="corrForm" data-target="${esc(target)}" data-title="${esc(title)}">
    <label for="cx">What is wrong, and what should it say?</label><textarea id="cx" name="text" required maxlength="3000" style="min-height:5rem"></textarea>
    <label for="cs">Your source <small>(book and page, document, link)</small></label><input id="cs" name="source" required maxlength="500">
    <div class="actions"><button class="btn small" type="submit">Send to the editors</button><button class="link" type="button" data-act="cancelCorr">Cancel</button></div></form>`;
  return `<button class="link quiet" data-act="correct" data-id="${esc(target)}">Suggest a correction</button>`;
}
function citePanel(title,hash){
  const url=location.href.split("#")[0]+"#"+hash;
  const t=`Sagat Singh Research Foundation. "${title}". SSRF research platform. Accessed ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}. ${url}`;
  return `<details class="citebox"><summary>Cite this page</summary><p class="cite-text" id="cite-${esc(hash)}">${esc(t)}</p><button class="btn small ghost" data-act="copyCite" data-id="cite-${esc(hash)}">Copy citation</button></details>`;
}
function campChecks(sel,name){sel=sel||[];return `<fieldset class="camps"><legend>Related campaigns</legend>${(S.camps.length?S.camps:SNAP.campaigns).map(c=>`<label class="check"><input type="checkbox" name="${name||"camps"}" value="${esc(c.id)}"${sel.includes(c.id)?" checked":""}> ${esc(c.name)}</label>`).join("")}</fieldset>`}
function more(view,total){const lim=S.limit[view]||20;return total>lim?`<button class="btn ghost small" data-act="more" data-id="${view}">Show ${Math.min(20,total-lim)} more of ${total-lim}</button>`:""}
const page=(view,arr)=>arr.slice(0,S.limit[view]||20);
async function sha256(buf){const h=await crypto.subtle.digest("SHA-256",buf);return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("")}

/* ================= Zip (store) for backups ================= */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u8){let c=0xFFFFFFFF;for(let i=0;i<u8.length;i++)c=CRC[(c^u8[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function makeZip(files){
  const enc=new TextEncoder(),parts=[],central=[];let off=0;
  for(const f of files){
    const name=enc.encode(f.name),data=f.data instanceof Uint8Array?f.data:enc.encode(String(f.data)),crc=crc32(data);
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);
    parts.push(new Uint8Array(h.buffer),name,data);
    const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,off,true);
    central.push(new Uint8Array(c.buffer),name);off+=30+name.length+data.length;
  }
  const cdSize=central.reduce((a,b)=>a+b.length,0),e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cdSize,true);e.setUint32(16,off,true);
  return new Blob([...parts,...central,new Uint8Array(e.buffer)],{type:"application/zip"});
}

/* ================= Data layer ================= */
const docs=snap=>snap.docs.filter(d=>d.exists).map(d=>({id:d.id,...d.data()}));
function markReady(key,snap){if(!snap||!snap.metadata||!snap.metadata.fromCache||snap.size)S.ready[key]=true;if(S.timer&&Object.keys(S.ready).length){S.slow=false}scheduleRender()}
function watch(key,ref,apply){
  if(unsub.has(key)||!S.db)return;
  const u=ref.onSnapshot(snap=>{apply(docs(snap));markReady(key,snap)},()=>{S.ready[key]=true;scheduleRender()});
  unsub.set(key,u);
}
function watchTree(key,prefix,target){
  if(unsub.has(key)||!S.db)return;
  const kids=new Map();
  const u=S.db.collection(prefix).onSnapshot(snap=>{
    const ids=new Set(snap.docs.filter(d=>d.exists).map(d=>d.id));
    for(const [id,fn] of kids)if(!ids.has(id)){try{fn&&fn()}catch(e){}kids.delete(id);target.delete(id)}
    for(const id of ids){if(kids.has(id))continue;
      kids.set(id,S.db.collection(`${prefix}/${id}/items`).onSnapshot(s=>{target.set(id,docs(s).map(x=>({...x,owner:id,authorId:x.authorId||id})));scheduleRender()},()=>{}));}
    markReady(key,snap);
  },()=>{S.ready[key]=true;scheduleRender()});
  unsub.set(key,()=>{try{u&&u()}catch(e){}for(const fn of kids.values()){try{fn&&fn()}catch(e){}}});
}
const STARTERS={
  claims:()=>watch("claims",S.db.collection("claims"),d=>S.claims=d),
  campaigns:()=>watch("campaigns",S.db.collection("campaigns"),d=>S.camps=d.sort((a,b)=>(a.order||0)-(b.order||0))),
  sources:()=>watch("sources",S.db.collection("sources"),d=>S.sources=new Map(d.map(x=>[x.id,x]))),
  entities:()=>watch("entities",S.db.collection("entities"),d=>S.entities=d),
  chapters:()=>watch("chapters",S.db.collection("chapters"),d=>S.chapters=d.sort((a,b)=>(a.order||0)-(b.order||0))),
  stories:()=>watch("stories",S.db.collection("stories").orderBy("createdAt","desc").limit(1000),d=>S.stories=d),
  books:()=>watch("books",S.db.collection("books").limit(1000),d=>S.books=d),
  places:()=>watch("places",S.db.collection("places").limit(500),d=>S.places=d),
  events:()=>watch("events",S.db.collection("events").limit(500),d=>S.events=d.filter(e=>e.date)),
  archive:()=>watch("archive",S.db.collection("archive").limit(1000),d=>S.archive=d),
  members:()=>watch("members",S.db.collection("members").limit(2000),d=>S.members=new Map(d.map(x=>[x.id,x]))),
  revisions:()=>watch("revisions",S.db.collection("revisions").orderBy("at","desc").limit(1000),d=>S.revisions=d),
  site:()=>watch("site",S.db.collection("site"),d=>S.site=Object.fromEntries(d.map(x=>[x.id,x]))),
  quiz:()=>watch("quiz",S.db.collection("quiz").limit(300),d=>{Q.all=d.filter(q=>q.q&&Array.isArray(q.options)&&q.options.length>1&&Number.isInteger(q.answer)&&q.options[q.answer]!=null).sort((a,b)=>(a.n||0)-(b.n||0));Q.ready=true}),
  salutes:()=>watch("salutes",S.db.collection("salutes"),d=>S.salutes=new Map(d.map(x=>[x.id,x.sids||[]]))),
  attend:()=>watch("attend",S.db.collection("attend"),d=>S.attend=new Map(d.map(x=>[x.id,x.eids||[]]))),
  media:()=>watchTree("media","media",S.media),
  subs:()=>{if(S.isAdmin)watchTree("subs","subs",S.subs);else if(S.uid)watch("subs",S.db.collection(`subs/${S.uid}/items`),d=>S.subs.set(S.uid,d.map(x=>({...x,owner:S.uid}))))},
  priv:()=>{if(S.isAdmin)watch("priv",S.db.collection("memberPrivate"),d=>{S.priv=new Map(d.map(x=>[x.id,x]));S.myPriv=S.priv.get(S.uid)||null});else if(S.uid&&!unsub.has("priv")){unsub.set("priv",S.db.doc("memberPrivate/"+S.uid).onSnapshot(s=>{S.myPriv=s.exists?s.data():null;S.ready.priv=true;scheduleRender()},()=>{S.ready.priv=true;scheduleRender()}))}},
  archFiles:()=>{if(S.isAdmin)watch("archFiles",S.db.collection("archiveFiles"),d=>S.archFiles=new Map(d.map(x=>[x.id,x])))}
};
const BASE=["claims","campaigns","sources","priv"];
const NEEDS={home:["events","stories","archive","quiz","books","places","site"],life:["revisions"],campaigns:["entities","stories","books","places","events","archive","revisions"],people:["entities"],archive:["archive","archFiles","revisions"],library:["books","revisions"],videos:["books","revisions"],sources:["places"],stories:["stories","salutes","revisions"],members:["members","chapters","stories","archive"],chapters:["chapters","members","events","stories","archive","media"],learn:["quiz"],events:["events","media","attend","chapters"],recognition:["places","revisions"],about:["site"],account:["subs","stories","archive","chapters"],search:["entities","stories","books","places","events","archive","members"],review:["subs","members","stories","books","places","events","archive","archFiles","revisions","entities","site","media","quiz"]};
function need(view){if(!S.db)return;for(const k of [...BASE,...(NEEDS[view]||[])])STARTERS[k]&&STARTERS[k]();}
const isReady=(...k)=>S.offline||k.every(x=>S.ready[x]);
function useSnapshot(){S.claims=SNAP.claims;S.camps=SNAP.campaigns;S.sources=new Map(Object.entries(SNAP.sources).map(([k,v])=>[k,{id:k,...v}]));S.entities=SNAP.entities;S.chapters=SNAP.chapters}

/* ================= Access (fail-closed) ================= */
function accessNotice(){
  if(S.offline)return `<div class="notice">You're reading a saved copy from ${esc(SNAP.at)}. Sign in to claude.ai and open the live page to see everything and to contribute.</div>`;
  if(S.slow&&!S.ready.claims)return `<div class="notice">The foundation's records can't be reached yet. They will appear when the connection returns.</div>`;
  if(S.access==="no")return `<div class="notice">You can read everything here. To contribute, ask the foundation to invite you as a contributor.</div>`;
  if(S.access==="unknown"&&S.uid)return `<div class="notice">We couldn't confirm that this account can contribute. <button class="link" data-act="probe">Check my access</button></div>`;
  if(S.access==="checking")return `<div class="notice">Checking your access…</div>`;
  return "";
}
async function probeAccess(){
  if(!S.db||!S.uid){S.access="no";render();return}
  S.access="checking";render();
  try{await S.db.doc("subs/"+S.uid).set({at:nowISO()});S.access="ok";toast("Confirmed. You can contribute.")}catch(e){S.access="no"}
  render();
}
function needJoin(what){
  if(S.access!=="ok")return accessNotice()||`<div class="notice">Contributing isn't available to this account.</div>`;
  return `<div class="panel"><p style="margin:0">Create your member profile to ${what}. It takes a minute.</p><p style="margin:.8rem 0 0"><a class="btn" href="#account">Join the community</a></p></div>`;
}
const contributeBtn=(act,id,label)=>S.form===id?"":`<button class="btn" data-act="${act}" data-id="${id}" ${canPost()?"":"disabled"} title="${canPost()?"":"Contributing needs a confirmed contributor account"}">${label}</button>`;
const reviewNote=`<p class="meta">Contributions go to the foundation's editors before they appear. You can follow yours under <a href="#account">My account</a>.</p>`;
