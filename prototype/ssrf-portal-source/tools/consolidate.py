import re,sys,json,collections,tinycss2
ORDER_MODE=sys.argv[1] if len(sys.argv)>1 else 'merge'   # 'merge' or 'sections'
SNAP=len(sys.argv)>2 and sys.argv[2]=='snap'
v2=open('/mnt/user-data/outputs/ssrf-v2.html').read()
css=re.search(r'<style>(.*?)</style>',v2,re.S).group(1)+open('v3/legacy/extra.css').read()
src=open('v3/all.js').read()+open('v3/body.html').read()
# ---------- dead classes
classes=set(re.findall(r'\.(-?[_a-zA-Z][\w-]*)',re.sub(r'url\([^)]*\)|"[^"]*"','',css)))
dyn=set(re.findall(r'([a-z][\w]*-)\$\{',src))
KEEP={'n1','n2','n3'}
dead={c for c in classes if c not in KEEP and not re.search(r'(?<![\w-])'+re.escape(c)+r'(?![\w-])',src) and not any(c.startswith(p) for p in dyn)}
# ---------- breakpoints
BP={'(max-width:560px)':'sm','(max-width:600px)':'sm','(max-width:640px)':'sm','(max-width:700px)':'md','(max-width:760px)':'md','(max-width:820px)':'lg','(max-width:900px)':'lg'}
BPQ={'lg':'(max-width:900px)','md':'(max-width:760px)','sm':'(max-width:600px)'}
CTXORDER=['','lg','md','sm']
def split_sel(s):
  out,depth,cur=[],0,''
  for ch in s:
    if ch in '([':depth+=1
    if ch in ')]':depth-=1
    if ch==',' and depth==0:out.append(cur.strip());cur=''
    else:cur+=ch
  if cur.strip():out.append(cur.strip())
  return out
atoms=[];pos=0;dropped_sel=0
def walk(items,ctx):
  global pos,dropped_sel
  for r in items:
    if r.type=='at-rule' and r.lower_at_keyword=='media':
      q=re.sub(r'\s+',' ',tinycss2.serialize(r.prelude).strip()).replace(': ',':')
      q=q.replace('prefers-color-scheme:dark','prefers-color-scheme: dark')
      walk(tinycss2.parse_rule_list(r.content,skip_comments=True,skip_whitespace=True),BP.get(q,q))
    elif r.type=='qualified-rule':
      sels=[re.sub(r'\s+',' ',s) for s in split_sel(tinycss2.serialize(r.prelude))]
      keep=[]
      for s in sels:
        cl=set(re.findall(r'\.(-?[_a-zA-Z][\w-]*)',s))
        if cl&dead:dropped_sel+=1;continue
        keep.append(s)
      decls=[d for d in tinycss2.parse_blocks_contents(r.content,skip_comments=True,skip_whitespace=True) if d.type=='declaration']
      for d in decls:
        pos+=1
        val=tinycss2.serialize(d.value).strip()
        for s in keep: atoms.append(dict(ctx=ctx,sel=s,prop=d.lower_name if not d.name.startswith('--') else d.name,val=val,imp=d.important,pos=pos))
    elif r.type=='at-rule':
      print('UNHANDLED at-rule',r.lower_at_keyword,file=sys.stderr)
walk(tinycss2.parse_stylesheet(css,skip_comments=True,skip_whitespace=True),'')
# ---------- winners
win={}
for a in atoms:
  k=(a['ctx'],a['sel'],a['prop']);w=win.get(k)
  if w is None or (a['imp'] or not w['imp']):win[k]=a
# prune narrower-context decls overridden by later wider/base decls of same sel+prop
nest={'lg':[''],'md':['','lg'],'sm':['','lg','md']}
for k,a in list(win.items()):
  ctx,sel,prop=k
  if ctx in nest:
    for wc in nest[ctx]:
      w=win.get((wc,sel,prop))
      if w and w['pos']>a['pos'] and not (a['imp'] and not w['imp']):
        win.pop(k,None);break
# ---------- value standardisation
PAL={'#F4F0E6':'var(--ivory)','#252A27':'var(--charcoal)','#303B30':'var(--olive-deep)','#D8D8D0':'var(--archive)','#B09555':'var(--brass-base)','#762633':'var(--burgundy)','#E6D7AE':'var(--brass-light)','#C4AE78':'var(--brass-soft)'}
SP=[(.25,'--sp-1'),(.5,'--sp-2'),(.75,'--sp-3'),(1,'--sp-4'),(1.25,'--sp-5'),(1.5,'--sp-6'),(2,'--sp-7'),(2.5,'--sp-8'),(3,'--sp-9'),(4,'--sp-10')]
FS=[(.7,'--fs-2xs'),(.78,'--fs-xs'),(.875,'--fs-sm'),(.95,'--fs-md'),(1.05,'--fs-base'),(1.15,'--fs-lg'),(1.35,'--fs-xl'),(1.75,'--fs-2xl'),(2.25,'--fs-3xl')]
AR={'4/3':'var(--ar-photo)','16/9':'var(--ar-video)','16/10':'var(--ar-video)','2/3':'var(--ar-cover)','4/5':'var(--ar-portrait)','1':'var(--ar-square)'}
def nearest(x,scale):
  return min(scale,key=lambda t:abs(t[0]-x))
def snap_space(v):
  def rep(m):
    x=float(m.group(1))
    if x<.2 or x>4.5:return m.group(0)
    n=nearest(x,SP)
    return f'var({n[1]})'
  return re.sub(r'(?<![\w.(-])(\d*\.?\d+)rem\b',rep,v)
HEAD=[(r'^h2$','var(--fs-page)'),(r'^\.sect$','var(--fs-section)'),(r'^\.(alanding|llanding|lclanding|mlanding) h2$','var(--fs-landing)'),
 (r'^(\.scard|\.lbody|\.mcard|\.lccard|\.rcard|\.lvpanel|section\.dos|\.camp) h[34]$','var(--fs-card-title)'),
 (r'^(\.lfeat \.lbody h3|article\.story h3|\.chcard h3|\.project h3)$','var(--fs-xl)')]
CARD_SHADOWS={'0 1px 2px rgba(37,42,39,.05),0 4px 14px rgba(37,42,39,.04)','0 1px 2px rgba(37,42,39,.06),0 4px 14px rgba(37,42,39,.05)'}
def transform(a):
  if a['sel'].startswith(':root') and a['prop'].startswith('--'):return a['val']
  v=a['val'];p=a['prop']
  if 'url(' not in v:
    for h,t in PAL.items(): v=re.sub(re.escape(h)+r'(?![0-9a-fA-F])',t,v,flags=re.I)
  if SNAP and p=='box-shadow' and v.replace(' ','') in {x.replace(' ','') for x in CARD_SHADOWS}:v='var(--shadow-card)'
  if SNAP and p=='font-size':
    for rx,tok in HEAD:
      if re.search(rx,a['sel']):return tok
  if SNAP:
    if p=='font-size' and re.fullmatch(r'\d*\.?\d+rem',v):
      x=float(v[:-3])
      if .6<=x<=2.4:v=f'var({nearest(x,FS)[1]})'
    if p in('margin','margin-top','margin-bottom','margin-left','margin-right','padding','padding-top','padding-bottom','padding-left','padding-right','gap','row-gap','column-gap','padding-inline','padding-block','margin-block','margin-inline'):
      if 'calc' not in v and 'clamp' not in v:v=snap_space(v)
    if p=='aspect-ratio' and v.replace(' ','') in AR:v=AR[v.replace(' ','')]
  return v
# ---------- manual patches for cross-context conflicts found by the computed-style audit
PATCH=[('md','.rmap','max-width','24rem')]
if SNAP:PATCH+=[('',f'.{c} .btn.ghost:hover','background','rgba(239,230,210,.12)') for c in ('alanding','lclanding','llanding','mlanding','cbanner')]
if SNAP:PATCH+=[('','main.wrap > h2:first-child','margin-top','var(--sp-7)'),
  ('','.btn:hover','filter','brightness(1.1)'),('','.btn.ghost:hover','background','rgba(118,38,51,.07)'),('','.btn.ghost:hover','filter','none'),
  ('','.cbanner .btn.ghost','color','var(--ivory)'),('','.cbanner .btn.ghost','border-color','rgba(239,230,210,.6)'),('','.cbanner .btn.ghost','background','transparent'),
  ('','.llanding .btn.ghost','color','var(--ivory)'),('','.llanding .btn.ghost','border-color','rgba(239,230,210,.6)'),('','.llanding .btn.ghost','background','transparent'),
  ('','.mlanding .btn.ghost','color','var(--ivory)'),('','.mlanding .btn.ghost','border-color','rgba(239,230,210,.6)'),('','.mlanding .btn.ghost','background','transparent')]
for k in [('','.qpolish','border-left'),('','.qpolish','box-shadow')]:win.pop(k,None)
for ctx,sel,prop,val in PATCH:
  pos+=1;win[(ctx,sel,prop)]=dict(ctx=ctx,sel=sel,prop=prop,val=val,imp=False,pos=pos)
# rule A must stay after every rule containing selector B (same specificity conflicts)
AFTER=[('.topbar','.wrap'),('.hero-cine h1','.hero-band h1'),('.qpolish','.quiz')]
# ---------- merge per (ctx,sel)
blocks=collections.OrderedDict()
for k,a in win.items():
  b=blocks.setdefault((a['ctx'],a['sel']),{'pos':0,'decls':[]})
  b['decls'].append(a);b['pos']=max(b['pos'],a['pos'])
rules=[]
for (ctx,sel),b in blocks.items():
  ds=sorted(b['decls'],key=lambda a:a['pos'])
  body=tuple((a['prop'],transform(a),a['imp']) for a in ds)
  rules.append(dict(ctx=ctx,sels=[sel],body=body,pos=b['pos']))
# ---------- sections
SECTIONS=[('Tokens and themes',r'^:root|^html|^\[data-theme'),
 ('Base elements',r'^(?![^\s]*[.#])[a-z*:\[][^.#]*$'),
 ('Layout and navigation',r'^(\.wrap|header|nav|\.navs|#groups|#subnav|\.subnav|\.brand|\.top|#meTab|#reviewTab|#hq|\.skip|#main|\.page|\.sub\b|section\.dos|\.dos\b|\.grid)'),
 ('Footer',r'footer|\.ft-'),
 ('Buttons and links',r'^(\.btn|\.link|button\.|a\.btn|\.actions|\.salute)'),
 ('Forms',r'^(form|\.panel form|\.field|\.choice|\.choices|\.form|fieldset|\.chk|\.req|\.hint|\.bar\b|\.bar )'),
 ('Shared content patterns',r'^(\.seg-tabs|\.sect\b|\.prose|\.stat\b|\.stat |\.stat\.|\.counts|\.inline-form|\.upl|\.body\b|\.legend|\.item-h|\.ln\b|\.quote|\.media-form|#hsearch|\.lead|\.kicker|\.eyebrow|\.mosaic)'),
 ('Tags, chips and labels',r'^(\.tag|\.tags|\.chip|\.pill|\.sid|\.mtag|\.badge|\.num|\.meta|\.nosrc)'),
 ('Cards and panels',r'^(\.card|\.cards|\.panel|\.notice|\.empty|#toast|\.toast|\.callout|\.stats)'),
 ('Tables',r'^(table|\.plain|\.meta-table)'),
 ('Claims, sources and evidence',r'claim|\.cite|\.src|\.assess|\.ev|\.diff|\.resol|\.status|\.hist|\.scard|\.sources|\.cites|\.prov|\.as-|\.st-'),
 ('Homepage',r'\.hero|\.ops|\.portrait|\.lede|\.mission|\.entry|\.hk-|\.home|\.emblem|\.em-'),
 ('Biography and timeline',r'timeline|\.life|\.chron|\.when|\.yr'),
 ('Campaigns',r'\.ctree|\.mlabel|\.msmall|\.camp|\.cb-|\.cbanner|\.cmap|\.mp-|\.vchron|\.vc-|\.orgchart|\.oc-|\.cphotos|\.toc|\.dossier|\.cnode|\.map|\.decis|\.lvpanel'),
 ('People and units',r'\.people|\.person|\.ent|\.unit'),
 ('Archive and viewer',r'\.arch|\.acard|\.aitem|\.acoll|\.atype|\.viewer|\.alanding|\.transcript|\.gallery|\.zoom|\.vw'),
 ('Library',r'\.lib|\.lcard|\.lfeat|\.llanding|\.lgroup|\.cover|\.lbook|\.shelf|\.lg-|\.lcov'),
 ('Videos',r'\.vplay|\.vdur|\.vtype|\.vbody|\.vmeta|\.vdesc|\.vcredit|\.vid|\.vcard|\.vthumb|\.vgrid|\.vfeat|\.vpost'),
 ('Members and chapters',r'\.mem|\.mcard|\.mgrp|\.mlanding|\.chap|\.chcard|\.chstats|\.imap|\.inmap|\.india'),
 ('Stories and projects',r'\.stor|\.project|\.people'),
 ('Learning centre and quiz',r'\.learn|\.lc|\.lccard|\.lcamp|\.quiz|\.qpolish|\.qbank|\.teach|\.evcard|\.lvl|\.natcard|\.tcard'),
 ('Events and recognition',r'\.concept|\.feature-museum|\.photo-strip|\.event|\.evt|\.evmap|\.reg|\.rcard|\.rthumb|\.ricon|\.rfilters|\.rmap|\.rlab|\.pstat'),
 ('About, account and review',r'\.about|\.review|\.acct|\.queue|\.backup|\.settings|\.priv'),
]
PRE=[('Buttons and links',r'^\.(hero-band|alanding|lclanding|llanding|mlanding|cbanner) \.btn'),('Base elements',r'^\.sr-only'),('Cards and panels',r'^a\.card'),('Footer',r'^footer'),
 ('Library',r'^\.(lsearch|lfilters|lgrid|lseal|lbody|lstat|lver|lmeta|ldesc|lacts|lverchk)\b'),
 ('Claims, sources and evidence',r'^\.(nats|snat|sgrid|sauth|suse|smeter|skey|swhere|snote|sopen)\b'),
 ('Members and chapters',r'^\.(mgroups|msect|mgrid|mhead|mphoto|mseal|mcat|mtitle|maff|mconn|mint|mcontrib|photo-consent|chhead|ipin|chgrid|chloc|chfacts|chact|chlab|chphotos|chnone)\b'),
 ('Learning centre and quiz',r'^\.(lmap|lvtabs|lvtab|tgrid)\b'),
 ('Events and recognition',r'^\.(rhead|rstats|rstatb|rgoa|rlink|rpin|lg|rgal|rfrow|rflab|rstate|rgrid|rstat|rimg-note|rtype|rloc|rfacts|rdesc|rhead2|rbadge|pbadge)\b'),
 ('Archive and viewer',r'^\.(aicon|asect|agrid|lock|backlink|vbtn|vz)\b'),
 ('Shared content patterns',r'^(ol\.results|ol\.trail|ul\.rel|label\.check)')]
def section(sel):
  for n,rx in PRE:
    if re.search(rx,sel):return [x for x,_ in SECTIONS].index(n)
  for i,(n,rx) in enumerate(SECTIONS):
    if re.search(rx,sel):return i
  return len(SECTIONS)
# combine identical bodies within ctx (and within one section)
grp=collections.OrderedDict()
for r in rules:
  g=grp.setdefault((r['ctx'],r['body'],section(r['sels'][0]) if ORDER_MODE=='sections' else 0),dict(ctx=r['ctx'],sels=[],body=r['body'],pos=0))
  g['sels']+=r['sels'];g['pos']=max(g['pos'],r['pos'])
rules=list(grp.values())
NAMES=[n for n,_ in SECTIONS]+['Other components']
def fmt_rule(r,ind=''):
  sel=(',\n'+ind).join(r['sels'])
  body=''.join(f"{ind}  {p}: {v}{' !important' if imp else ''};\n" for p,v,imp in r['body'])
  return f"{ind}{sel} {{\n{body}{ind}}}\n"
def enforce(lst):
  for a,b in AFTER:
    ia=[i for i,r in enumerate(lst) if a in r['sels']]
    ib=[i for i,r in enumerate(lst) if b in r['sels']]
    if ia and ib and ia[0]<ib[-1]:
      r=lst.pop(ia[0]);j=max(i for i,x in enumerate(lst) if b in x['sels']);r['sec']=lst[j].get('sec');lst.insert(j+1,r)
  return lst
HEADER=open('css_header.css').read() if __import__('os').path.exists('css_header.css') else ''
out=[HEADER]
base=[r for r in rules if r['ctx']=='']
if ORDER_MODE=='sections':
  for r in base:r['sec']=min(section(s) for s in r['sels'])
  base.sort(key=lambda r:(r['sec'],r['pos']))
  base=enforce(base)
  cur=None
  for r in base:
    if r['sec']!=cur:cur=r['sec'];out.append(f"\n/* ==================== {cur+1:02d}. {NAMES[cur]} ==================== */\n\n")
    out.append(fmt_rule(r))
else:
  base.sort(key=lambda r:r['pos'])
if ORDER_MODE!='sections':
  out+=[fmt_rule(r) for r in enforce(base)]
names={'lg':'Responsive: large (max-width 900px)','md':'Responsive: medium (max-width 760px)','sm':'Responsive: small (max-width 600px)'}
for ctx in ['lg','md','sm']+[c for c in dict.fromkeys(r['ctx'] for r in rules) if c not in ('','lg','md','sm')]:
  rs=sorted([r for r in rules if r['ctx']==ctx],key=lambda r:r['pos'])
  if not rs:continue
  q=BPQ.get(ctx,ctx)
  out.append(f"\n/* ==================== {names.get(ctx,'Media '+ctx)} ==================== */\n@media {q} {{\n"+''.join(fmt_rule(r,'  ') for r in rs)+"}\n")
res=''.join(out)
open('v3/ssrf.css','w').write(res)
print('atoms',len(atoms),'winners',len(win),'rules',len(rules),'dropped selectors',dropped_sel,'dead classes',len(dead),'bytes',len(res),file=sys.stderr)
