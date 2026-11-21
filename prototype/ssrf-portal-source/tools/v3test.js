const {JSDOM}=require("jsdom");const fs=require("fs"),path=require("path");
const V3="/tmp/claude-0/-home-claude/b7a279b2-4956-5635-8d5e-ce4352c6212b/scratchpad/v3/";
const html=fs.readFileSync("/mnt/user-data/outputs/ssrf-v3.html","utf8");
function store(){const m=new Map();
  for(const col of fs.readdirSync(V3+"seed"))for(const f of fs.readdirSync(V3+"seed/"+col))m.set(col+"/"+f.replace(".json",""),JSON.parse(fs.readFileSync(V3+"seed/"+col+"/"+f)));
  const q=JSON.parse(fs.readFileSync("/tmp/claude-0/-home-claude/b7a279b2-4956-5635-8d5e-ce4352c6212b/scratchpad/qjson/q01.json"));
  for(let i=1;i<=30;i++){const id="q"+String(i).padStart(2,"0");m.set("quiz/"+id,JSON.parse(fs.readFileSync(`/tmp/claude-0/-home-claude/b7a279b2-4956-5635-8d5e-ce4352c6212b/scratchpad/qjson/${id}.json`)))}
  for(const w of JSON.parse(fs.readFileSync(V3+"migwrites.json")))if(w.collection==="quiz"){const k="quiz/"+w.doc_id;m.set(k,{...m.get(k),...JSON.parse(fs.readFileSync(w.file_path))})}
  m.set("books/b1",{title:"A Talent for War",kind:"Biography",creator:"Sinh",status:"verified",camps:["meghna"],nature:"Secondary research"});
  m.set("places/p1",{name:"Statue",kind:"Statue",status:"verified",state:"Rajasthan",city:"Churu"});
  m.set("events/e1",{title:"Goa Day",date:"2026-12-19",type:"Commemorative",camps:["goa"]});
  m.set("events/e2",{title:"Old",date:"2020-01-01",summary:"done"});
  m.set("stories/s1",{title:"Meghna night",body:"x".repeat(300),kind:"Anecdote",era:"1971 war",assessment:"attributed",nature:"Oral history",authorId:"u2",authorName:"A member",attribution:"anonymous",camps:["meghna"],createdAt:"2026-11-10"});
  m.set("memberPrivate/u1",{name:"Editor One",category:"Founding member",chapter:"Goa",listed:true});
  m.set("memberPrivate/u2",{name:"Veteran Two",category:"Veteran member",chapter:"Goa",listed:true});
  m.set("members/u2",{name:"Veteran Two",category:"Veteran member",chapter:"Goa"});
  return m;}
function mockDb(m,log){
  const listeners=new Set();const notify=()=>setTimeout(()=>listeners.forEach(l=>l()),0);
  const kids=p=>{const segs=p.split("/").length;return [...m.keys()].filter(k=>k.startsWith(p+"/")&&k.split("/").length===segs+1)};
  const parentsOf=p=>{const segs=p.split("/").length;const s=new Set();for(const k of m.keys())if(k.startsWith(p+"/")&&k.split("/").length>segs+1)s.add(k.split("/").slice(0,segs+1).join("/"));for(const k of kids(p))s.add(k);return [...s]};
  const snapOf=(keys)=>({size:keys.length,metadata:{fromCache:false},docs:keys.map(k=>({id:k.split("/").pop(),exists:true,data:()=>JSON.parse(JSON.stringify(m.get(k)||{}))}))});
  let n=0;
  const col=p=>{const q={orderBy:()=>q,limit:()=>q,where:()=>q,
    onSnapshot:(next,err)=>{const run=()=>next(snapOf(p==="subs"||p==="media"?parentsOf(p):kids(p)));listeners.add(run);setTimeout(run,0);return()=>listeners.delete(run)},
    get:async()=>snapOf(p==="subs"||p==="media"?parentsOf(p):kids(p)),
    add:async d=>{const id="auto"+(++n);m.set(p+"/"+id,d);log.push(["add",p,d]);notify();return {id}},doc:id=>doc(p+"/"+id)};return q};
  const doc=k=>({get:async()=>({exists:m.has(k),data:()=>m.get(k)}),
    onSnapshot:(next)=>{const run=()=>next({exists:m.has(k),data:()=>m.get(k)});listeners.add(run);setTimeout(run,0);return()=>listeners.delete(run)},
    set:async d=>{m.set(k,d);log.push(["set",k,d]);notify()},update:async d=>{if(!m.has(k))throw {code:"invalid_argument"};m.set(k,{...m.get(k),...d});log.push(["update",k,d]);notify()},delete:async()=>{m.delete(k);log.push(["delete",k]);notify()}});
  return {collection:col,doc};
}
async function run(label,uid,can,admin,fn){
  const m=store(),log=[],errs=[];
  const dom=new JSDOM(html,{runScripts:"dangerously",url:"https://x.test/#home",pretendToBeVisual:true,beforeParse(w){
    w.claude=uid===null?undefined:{use:async n=>n==="db"?mockDb(m,log):n==="user"?{id:async()=>uid,can:async()=>can,isOwner:async()=>admin,canEdit:async()=>admin}:n==="assets"?(admin?{upload:async f=>({id:"a1",url:"/_blob/a1"}),delete:async()=>{}}:null):n==="downloads"?{save:async x=>{log.push(["download",x.filename,typeof x.data==="string"?x.data.length:"blob"])}}:null};
    w.requestAnimationFrame=f=>setTimeout(f,0);w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};w.TextEncoder=require('util').TextEncoder;w.TextDecoder=require('util').TextDecoder;Object.defineProperty(w,'crypto',{value:require('crypto').webcrypto,configurable:true});}});
  const w=dom.window;w.addEventListener("error",e=>errs.push(e.message));w.console.error=(...a)=>errs.push(a.join(" "));
  const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(200);
  const go=async h=>{w.location.hash=h;await wait(120)};const txt=()=>w.document.querySelector("#main").textContent.replace(/\s+/g," ");
  const click=async sel=>{const el=w.document.querySelector(sel);if(!el)throw new Error("no "+sel);el.click();await wait(150)};
  await fn({w,go,txt,click,wait,m,log});
  console.log(`[${label}] errors:`,errs.length?errs:"none");
}
(async()=>{
await run("editor","u1",true,true,async({w,go,txt,click,wait,m,log})=>{
  for(const v of ["home","life","campaigns","people","archive","library","videos","sources","stories","members","chapters","learn","events","recognition","about","account","search","review"]){await go("#"+v);console.log(v.padEnd(12),txt().length,txt().slice(0,60))}
  await go("#life");await click('[data-act="toggle"][data-id="claims/life-1938"]');console.log("evidence panel:",/What needs resolution.*Jaipur/.test(txt()));
  await click('[data-act="edit"][data-id="claims/life-1938"]');const f=w.document.querySelector("#claimForm");f.elements["text"].value="Edited claim text.";f.elements["reason"].value="Test";f.requestSubmit();await wait(200);
  console.log("claim edited:",m.get("claims/life-1938").text, "revision logged:",log.some(l=>l[0]==="add"&&l[1]==="revisions"&&l[2].before));
  await go("#campaigns");await click('[data-act="camp"][data-id="meghna"]');console.log("meghna map:",!!w.document.querySelector("figure.map svg"),"command nodes:",w.document.querySelectorAll(".cnode").length);
  await go("#search");const sf=w.document.querySelector("#searchForm");sf.elements["q"].value="Meghna";sf.requestSubmit();await wait(150);console.log("search:",txt().match(/\d+ results?/)?.[0],"marks:",w.document.querySelectorAll("mark").length);
  await go("#learn");await click('[data-act="qSet"][data-id="topic:goa"]');await click('[data-act="qStart"]');console.log("quiz goa set:",w.document.querySelector("#quiz").textContent.match(/of (\d+)/)?.[1]);
  await click('[data-act="qPick"][data-id="1"]');console.log("learn more link:",/Learn more/.test(w.document.querySelector("#quiz").textContent));
  await go("#review");await click('[data-act="backupJson"]');await wait(1200);console.log("toast:",w.document.querySelector("#toast").textContent);console.log("backup:",log.filter(l=>l[0]==="download").map(l=>l[1]).join(","));
});
await run("contributor","u2",true,false,async({w,go,txt,click,wait,m,log})=>{
  await go("#stories");await click('[data-act="form"][data-id="story"]');const f=w.document.querySelector("#storyForm");
  f.elements["title"].value="Test account";f.elements["body"].value="Body";f.elements["consent"].checked=true;f.querySelector('input[name=camps][value=goa]').checked=true;f.requestSubmit();await wait(250);
  const sub=[...m.entries()].find(([k])=>k.startsWith("subs/u2/items/"));console.log("submitted:",!!sub,sub&&sub[1].status,sub&&sub[1].data.camps);
  sub[1].status="evidence";sub[1].note="Please add a source";
  await go("#home");await go("#account");console.log("account shows evidence request:",/Evidence requested/.test(txt()),/Please add a source/.test(txt()));
  await click('[data-act="resub"]');const rf=w.document.querySelector("#storyForm");console.log("prefilled:",rf.elements["title"].value);rf.elements["sources"].value="Unit diary";rf.elements["consent"].checked=true;rf.requestSubmit();await wait(250);
  const cur=m.get(sub[0]);console.log("resubmitted:",cur.status,"history:",cur.history.length,"prev kept:",!!cur.history.at(-1).prev,"new sources:",cur.data.sources);
  await go("#life");await click('[data-act="toggle"][data-id="claims/life-1919"]');await click('[data-act="correct"][data-id="claims/life-1919"]');
  const cf=w.document.querySelector("#corrForm");cf.elements["text"].value="Should say 1918";cf.elements["source"].value="School record";cf.requestSubmit();await wait(200);
  console.log("correction sent:",[...m.values()].some(v=>v.kind==="correction"));
  await go("#review");console.log("review hidden for contributor:",/for the foundation's editors/.test(txt()));
});
await run("editor-decides","u1",true,true,async({w,go,txt,click,wait,m,log})=>{
  m.set("subs/u2",{at:"x"});m.set("subs/u2/items/c1",{kind:"correction",status:"submitted",createdAt:"2026-11-14",data:{target:"claims/life-1919",title:"1919",text:"wrong",source:"book"},history:[]});
  m.set("subs/u2/items/s9",{kind:"story",status:"submitted",createdAt:"2026-11-14",data:{title:"Story nine",body:"B",prov:"first",attribution:"named",camps:["goa"]},history:[]});
  await wait(100);await go("#review");await wait(200);
  let forms=[...w.document.querySelectorAll("form.decide")];console.log("decide forms:",forms.length);
  const cform=forms.find(f=>f.dataset.sub==="u2/c1");cform.elements["newText"].value="Born in 1919 (corrected).";cform.elements["note"].value="Checked";cform.elements["coi"].checked=true;
  cform.requestSubmit(cform.querySelector('button[value="apply"]'));await wait(300);
  console.log("correction applied:",m.get("claims/life-1919").text,"status:",m.get("subs/u2/items/c1").status);
  forms=[...w.document.querySelectorAll("form.decide")];const sform=forms.find(f=>f.dataset.sub==="u2/s9");sform.elements["coi"].checked=true;sform.requestSubmit(sform.querySelector('button[value="publish"]'));await wait(300);
  const pub=[...m.entries()].find(([k,v])=>k.startsWith("stories/")&&v.title==="Story nine");console.log("published story:",!!pub,pub&&pub[1].authorName,pub&&pub[1].assessment,pub&&pub[1].camps);
});
await run("signed-out",null,null,false,async({w,go,txt})=>{for(const v of ["home","life","campaigns","account"]){await go("#"+v);console.log(v.padEnd(10),txt().slice(0,90))}});
await run("view-only","u3",false,false,async({go,txt,w})=>{await go("#stories");console.log("view-only notice:",/ask the foundation to invite you/.test(txt()),"button disabled:",w.document.querySelector('[data-act="form"][data-id="story"]').disabled)});
await run("unknown-access","u4",null,false,async({go,txt,click,wait,w})=>{await go("#stories");console.log("unknown shows check:",/Check my access/.test(txt()),"btn disabled:",w.document.querySelector('[data-act="form"][data-id="story"]').disabled);await click('[data-act="probe"]');await wait(200);console.log("after probe enabled:",!w.document.querySelector('[data-act="form"][data-id="story"]').disabled)});
})();
