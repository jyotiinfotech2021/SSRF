// usage: node shots.js <html> <outdir> [filter]
const {chromium}=require('playwright');const fs=require('fs');
const T=fs.readFileSync('../t/v3test.js','utf8');
const src=(a,b)=>T.slice(T.indexOf(a),T.indexOf(b));
const storeSrc=src('function store(){','function mockDb(');const mockSrc=src('function mockDb(','async function run(');
const store=new Function('fs','path','V3',storeSrc+';return store;')(fs,require('path'),'/tmp/claude-0/-home-claude/b7a279b2-4956-5635-8d5e-ce4352c6212b/scratchpad/v3/');
const entries=[...store().entries()];
const [,,HTML,OUT,FILT]=process.argv;fs.mkdirSync(OUT,{recursive:true});
const PUB=["home","life","campaigns:goa","campaigns:nathula","campaigns:meghna","people","archive","library","videos","sources","stories","members","chapters","learn","events","recognition","about","account","search"];
const ED=["home","life","campaigns:meghna","archive","library","sources","stories","members","chapters","learn","events","recognition","about","account","review"];
(async()=>{const b=await chromium.launch();
 async function sess(tag,role,views,w,h,dark){
  const ctx=await b.newContext({viewport:{width:w,height:h},reducedMotion:'reduce',colorScheme:dark?'dark':'light'});
  if(role)await ctx.addInitScript(([E,M])=>{const m=new Map(E);const mockDb=new Function(M+';return mockDb')();
    window.claude={use:async n=>n==="db"?mockDb(m,[]):n==="user"?{id:async()=>"u1",can:async()=>true,isOwner:async()=>true,canEdit:async()=>true,me:async()=>({id:"u1",name:"Editor"}),profiles:async()=>({})}:n==="assets"?{upload:async()=>({id:"a1",url:"/_blob/a1"}),list:async()=>({assets:[]})}:null}},[entries,mockSrc]);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+HTML+'#home');await p.waitForTimeout(1500);
  if(role)await p.evaluate(()=>{S.research=true;render()});
  for(const v of views){const [vw,camp]=v.split(':');const name=`${tag}-${v.replace(':','-')}`;if(FILT&&!name.includes(FILT))continue;
   await p.evaluate(h=>{location.hash=h},vw);await p.waitForTimeout(350);
   if(camp)await p.evaluate(c=>{S.camp=c;render()},camp);
   await p.evaluate(()=>{window.scrollTo(0,0)});await p.waitForTimeout(250);
   await p.screenshot({path:`${OUT}/${name}.png`,fullPage:true,animations:'disabled'});}
  if(errs.length)console.log(tag,errs);await ctx.close();}
 await sess('pub-d',null,PUB,1366,900);
 await sess('pub-m',null,PUB,390,844);
 await sess('dark-d',null,["home","campaigns:meghna","library","sources","about","learn"],1366,900,true);
 await sess('dark-m',null,["home","campaigns:goa"],390,844,true);
 await sess('ed-d',1,ED,1366,900);
 await sess('ed-m',1,["home","learn","review","about","account"],390,844);
 await b.close();console.log('done',fs.readdirSync(OUT).length)})();
