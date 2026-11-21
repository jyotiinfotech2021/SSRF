const {chromium}=require('playwright');const fs=require('fs');
const T=fs.readFileSync('../t/v3test.js','utf8');const src=(a,b)=>T.slice(T.indexOf(a),T.indexOf(b));
const store=new Function('fs','path','V3',src('function store(){','function mockDb(')+';return store;')(fs,require('path'),'/tmp/claude-0/-home-claude/b7a279b2-4956-5635-8d5e-ce4352c6212b/scratchpad/v3/');
const entries=[...store().entries()];const mockSrc=src('function mockDb(','async function run(');
const [,,A,B]=process.argv;
const PROPS=['display','position','margin-top','margin-bottom','margin-left','margin-right','padding-top','padding-bottom','padding-left','padding-right','font-size','font-weight','font-family','font-style','line-height','color','background-color','background-image','border-top-width','border-top-style','border-top-color','border-left-width','border-left-color','border-bottom-width','border-bottom-color','border-right-width','box-shadow','grid-template-columns','gap','text-align','letter-spacing','text-transform','opacity','max-width','min-width','max-height','flex-direction','flex-wrap','justify-content','align-items','aspect-ratio','object-fit','outline-style','outline-color','text-decoration-line','list-style-type','visibility','overflow-x','fill','stroke','stroke-width','stroke-dasharray','z-index','white-space','width','height'];
const PUB=["home","life","campaigns:goa","campaigns:nathula","campaigns:meghna","people","archive","library","videos","sources","stories","members","chapters","learn","events","recognition","about","account","search"];
const ED=["home","life","campaigns:meghna","campaigns:goa","archive","library","videos","sources","stories","members","chapters","learn","events","recognition","about","account","review","search"];
(async()=>{const b=await chromium.launch();const all=new Map();
async function grab(f,role,w,dark,views){const ctx=await b.newContext({viewport:{width:w,height:900},reducedMotion:'reduce',colorScheme:dark?'dark':'light'});
 if(role)await ctx.addInitScript(([E,M])=>{const m=new Map(E);const mockDb=new Function(M+';return mockDb')();window.claude={use:async n=>n==="db"?mockDb(m,[]):n==="user"?{id:async()=>"u1",can:async()=>true,isOwner:async()=>true,canEdit:async()=>true,me:async()=>({id:"u1",name:"Editor"}),profiles:async()=>({})}:n==="assets"?{upload:async()=>({id:"a1",url:"/_blob/a1"}),list:async()=>({assets:[]})}:null}},[entries,mockSrc]);
 const p=await ctx.newPage();await p.goto('file://'+f+'#home');await p.waitForTimeout(1300);if(role)await p.evaluate(()=>{S.research=true;render()});
 const out={};
 for(const v of views){await p.evaluate(h=>{location.hash=h},v.split(':')[0]);await p.waitForTimeout(250);if(v.includes(':'))await p.evaluate(c=>{S.camp=c;render()},v.split(':')[1]);await p.waitForTimeout(150);
  out[v]=await p.evaluate(P=>[...document.querySelectorAll('body *'),...[...document.querySelectorAll('body *')].flatMap(e=>[])].map(e=>{const s=getComputedStyle(e);const b4=getComputedStyle(e,'::before'),af=getComputedStyle(e,'::after');const id=e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\s+/).join('.'):(e.className&&e.className.baseVal?'.'+e.className.baseVal.trim().split(/\s+/).join('.'):''));return [id,P.map(k=>s.getPropertyValue(k)).concat(['content','width','height','top','left','border-top-width','background-color','border-left-width'].map(k=>'B:'+b4.getPropertyValue(k)+' A:'+af.getPropertyValue(k)))]}),PROPS)}
 await ctx.close();return out}
const states=[['pub-d',0,1366,0,PUB],['pub-t',0,820,0,PUB],['pub-m',0,390,0,PUB],['ed-d',1,1366,0,ED],['ed-m',1,390,0,ED],['dark-d',0,1366,1,["home","campaigns:meghna","library","sources","learn","archive"]]];
let total=0;
for(const [tag,role,w,dark,views] of states){const x=await grab(A,role,w,dark,views),y=await grab(B,role,w,dark,views);
 for(const v of views){const X=x[v],Y=y[v];if(X.length!==Y.length){console.log(tag,v,'DOM length',X.length,Y.length)}
  for(let i=0;i<Math.min(X.length,Y.length);i++){if(X[i][0]!==Y[i][0]){console.log(tag,v,'DOM mismatch',X[i][0]);break}
   const names=PROPS.concat(['pseudo-content','pseudo-width','pseudo-height','pseudo-top','pseudo-left','pseudo-btw','pseudo-bg','pseudo-blw']);
   names.forEach((k,j)=>{if(X[i][1][j]!==Y[i][1][j]){const key=X[i][0]+'|'+k;if(!all.has(key)){all.set(key,`${tag} ${v} | ${X[i][0].slice(0,80)} | ${k} | ${String(X[i][1][j]).slice(0,70)} => ${String(Y[i][1][j]).slice(0,70)}`)}}})}}}
const lines=[...all.values()];fs.writeFileSync('diffs.txt',lines.join('\n'));
// suppress width/height noise lines when other props differ on same element
console.log('distinct diffs',lines.length);console.log(lines.filter(l=>!/\| (width|height) \|/.test(l)).slice(0,80).join('\n'));await b.close()})();
