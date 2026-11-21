import sys,os
from PIL import Image,ImageChops
a,b=sys.argv[1],sys.argv[2];res=[]
for f in sorted(os.listdir(a)):
  if not f.endswith('.png') or not os.path.exists(f'{b}/{f}'):continue
  A=Image.open(f'{a}/{f}').convert('RGB');B=Image.open(f'{b}/{f}').convert('RGB')
  if A.size!=B.size:res.append((f,'SIZE',A.size,B.size));continue
  d=ImageChops.difference(A,B).convert('L').point(lambda x:255 if x>24 else 0)
  n=sum(d.histogram()[255:]);bb=d.getbbox()
  if n:res.append((f,n,bb))
for r in res:print(*r)
print('changed',len(res))
