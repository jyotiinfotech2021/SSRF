import json,math,sys
from shapely.geometry import shape,box,mapping
from shapely.ops import unary_union
G='/tmp/claude-0/-home-claude/b7a279b2-4956-5635-8d5e-ce4352c6212b/scratchpad/geo/'
st={f['properties']['ST_NM']:shape(f['geometry']).buffer(0) for f in json.load(open(G+'states.geojson'))['features']}
co={f['properties']['ADMIN']:shape(f['geometry']).buffer(0) for f in json.load(open(G+'ne_10m_admin_0_countries.geojson'))['features'] if f['properties']['ADMIN'] in ('Bangladesh','Bhutan','China','Nepal','India','Myanmar')}
MAPS={'goa':dict(bb=(73.55,74.45,14.86,15.84),W=640,focus='Goa',foreign=[]),
 'nathula':dict(bb=(88.05,89.15,26.98,28.15),W=640,focus='Sikkim',foreign=['China','Bhutan','Nepal']),
 'meghna':dict(bb=(90.25,92.2,23.35,25.15),W=640,focus=None,foreign=['Bangladesh','Myanmar','Bhutan'])}
def proj(bb,W):
  lon0,lon1,lat0,lat1=bb;kx=W/(lon1-lon0);ky=kx/math.cos(math.radians((lat0+lat1)/2));H=round((lat1-lat0)*ky)
  return kx,ky,H
def path(g,bb,kx,ky):
  if g.is_empty:return ''
  lon0,lon1,lat0,lat1=bb;out=[]
  polys=[g] if g.geom_type=='Polygon' else [p for p in getattr(g,'geoms',[]) if p.geom_type=='Polygon']
  for p in polys:
    for ring in [p.exterior,*p.interiors]:
      pts=[f"{(x-lon0)*kx:.1f} {(lat1-y)*ky:.1f}" for x,y in ring.coords]
      if len(pts)>2: out.append('M'+'L'.join(pts)+'Z')
  return ''.join(out)
def lines(g,bb,kx,ky):
  lon0,lon1,lat0,lat1=bb;out=[]
  gs=[g] if g.geom_type=='LineString' else list(getattr(g,'geoms',[]))
  for l in gs:
    if l.geom_type!='LineString':continue
    out.append('M'+'L'.join(f"{(x-lon0)*kx:.1f} {(lat1-y)*ky:.1f}" for x,y in l.coords))
  return ''.join(out)
res={}
for k,m in MAPS.items():
  bb=m['bb'];kx,ky,H=proj(bb,m['W']);tol=0.6/kx
  B=box(bb[0]-.05,bb[2]-.05,bb[1]+.05,bb[3]+.05)
  parts={n:g.intersection(B) for n,g in st.items() if g.intersects(B)}
  india=unary_union(list(parts.values())).buffer(0)
  ind=india.simplify(tol)
  land=[ind]+[co[c].intersection(B) for c in m['foreign']]
  foreign=unary_union([co[c].intersection(B) for c in m['foreign']]).difference(india).simplify(tol) if m['foreign'] else None
  if k=='nathula': # beyond India's boundary to the north/east is Tibet (China)
    pass
  allland=unary_union([g for g in land if not g.is_empty]+([co['China'].intersection(B)] if k!='goa' else [])+[co['India'].intersection(B),india])
  sea=B.difference(allland).simplify(tol)
  # internal state borders within bbox
  sb=unary_union([g.boundary for g in parts.values()])
  # keep only internal (both sides India): subtract India outline
  internal=sb.difference(india.boundary.buffer(1.5/kx)).difference(B.boundary.buffer(1.5/kx)).simplify(tol)
  d=dict(W=m['W'],H=H,bb=bb,ind=path(ind,bb,kx,ky),sea=path(sea,bb,kx,ky),internal=lines(internal,bb,kx,ky))
  if m['focus']:d['focus']=path(st[m['focus']].simplify(tol),bb,kx,ky)
  if foreign is not None:d['foreign']=path(foreign,bb,kx,ky)
  if k=='meghna':d['focus']=path(co['Bangladesh'].intersection(B).simplify(tol),bb,kx,ky)
  fg=(co['Bangladesh'] if k=='meghna' else st[m['focus']]).intersection(B).simplify(tol)
  d['focusLine']=lines(fg.boundary.difference(B.exterior.buffer(1.5/kx)),bb,kx,ky)
  res[k]=d
  print(k,H,{a:len(b) for a,b in d.items() if isinstance(b,str)},file=sys.stderr)
open('cmaps.json','w').write(json.dumps(res,separators=(',',':')))
