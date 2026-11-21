"""Build the SSRF portal into one self-contained HTML file.
Usage:  python3 build.py            -> dist/ssrf-portal.html
"""
import os
d=os.path.join(os.path.dirname(os.path.abspath(__file__)),'src')+os.sep
R=lambda f:open(d+f,encoding='utf-8').read()
js='\n'.join(R(f) for f in ('core.js','cmaps.js','views.js','ops.js'))
js=js.replace('__SNAPSHOT__',R('snapshot.json').replace('</','<\\/'))
html=(R('head.html')+'<style>'+R('ssrf.css')+'</style>\n</head>\n<body>\n'+R('body.html')
      +'\n<script>\n'+js+'\n</script>\n</body>\n</html>\n')
out=os.path.join(os.path.dirname(os.path.abspath(__file__)),'dist','ssrf-portal.html')
os.makedirs(os.path.dirname(out),exist_ok=True);open(out,'w',encoding='utf-8').write(html)
print('wrote',out,len(html),'bytes')
