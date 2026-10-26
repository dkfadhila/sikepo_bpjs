from pathlib import Path
import re,json,hashlib,urllib.request,urllib.parse,concurrent.futures,html
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'dist'; ASSETS=OUT/'assets'; ASSETS.mkdir(parents=True,exist_ok=True)
source=(ROOT/'reference.html').read_text(encoding='utf-8')
URL=re.compile(r'https://(?:framerusercontent\.com|fonts\.gstatic\.com)/[^\s<>"\x27`)\\]+')
MODULE=re.compile(r'["\x27`]((?:\./|\.\./)[^"\x27`\s]+\.mjs)["\x27`]')
mapping={}; raw={}; failures=[]
def name(url):
 p=urllib.parse.urlsplit(url); base=Path(p.path).name
 return re.sub(r'[^\w.\-]','_',base.rsplit('.',1)[0])[:90]+'-'+hashlib.sha256(url.encode()).hexdigest()[:12]+Path(p.path).suffix

def download(url):
 target=ASSETS/name(url)
 try:
  if target.exists() and not url.endswith('.mjs'): b=target.read_bytes()
  else:
   req=urllib.request.Request(html.unescape(url),headers={'User-Agent':'Mozilla/5.0'})
   with urllib.request.urlopen(req,timeout=50) as r:b=r.read()
   target.write_bytes(b)
  return url,b,None
 except Exception as e:return url,b'',str(e)

pending=set(URL.findall(source)); seen=set()
# Search-index JSON is not required to render the homepage.
pending={u for u in pending if not '/sites/' in u or u.endswith('.mjs')}
while pending:
 batch=pending-seen
 if not batch:break
 seen.update(batch); pending=set()
 print('Downloading',len(batch),'resources; total',len(seen),flush=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
  for u,b,error in pool.map(download,sorted(batch)):
   if error:failures.append({'url':u,'error':error});continue
   mapping[u]='assets/'+name(u)
   if u.endswith('.mjs'):
    text=b.decode('utf-8');raw[u]=text
    pending.update(urllib.parse.urljoin(u,x) for x in MODULE.findall(text))
    # Include media embedded by hydrated interactive components.
    pending.update(x for x in URL.findall(text) if not x.endswith('.map') and x != 'https://fonts.gstatic.com/s/')

# Rewrite every module reference relative to its own local asset directory.
for u,s in raw.items():
 for relative in set(MODULE.findall(s)):
  full=urllib.parse.urljoin(u,relative)
  if full in mapping:s=s.replace(relative,'./'+Path(mapping[full]).name)
 for remote in sorted(set(URL.findall(s)),key=len,reverse=True):
  if remote in mapping and not remote.endswith('.js'):s=s.replace(remote,'/assets/'+Path(mapping[remote]).name)
 if 'script_main.' in u:
  # The exported page has its own separate badge root; omit its mount entirely.
  s=re.sub(r'\(function\(\)\{Gn&&a\(\(\)=>\{ne\(document\.getElementById\(`__framer-badge-container`\),.*?\}\)\}\)\(\)', '',s)
 (ASSETS/name(u)).write_text(s,encoding='utf-8')

# Omit tracking, editor loader, and template-author floating promotional link.
source=re.sub(r'<script\b[^>]*src="https://events\.framer\.com/[^\"]*"[^>]*>.*?</script>','',source,flags=re.S)
source=re.sub(r'<script\b[^>]*>[^<]*__framer_force_showing_editorbar_since.*?</script>','',source,flags=re.S)
source=re.sub(r'<script\b[^>]*>\s*\(function\(\)\s*\{\s*var link = document.createElement\(\x27a\x27\);.*?</script>','',source,flags=re.S)
# Remove the complete, nested badge DOM without disturbing the page root.
marker='<div id="__framer-badge-container">'
start=source.find(marker)
if start>=0:
 depth=0
 for m in re.finditer(r'</?div\b[^>]*>',source[start:]):
  depth+= -1 if m.group().startswith('</') else 1
  if depth==0:
   source=source[:start]+source[start+m.end():];break
for remote in sorted(mapping,key=len,reverse=True):source=source.replace(remote,mapping[remote])
source=re.sub(r'<link\b[^>]*rel="canonical"[^>]*>','',source)
source=re.sub(r'<meta\b[^>]*name="framer-search-index"[^>]*>','',source)
source=source.replace('</head>','''<link rel="stylesheet" href="local.css">\n</head>''')
source=source.replace('</body>','''<script src="local.js" defer></script>\n</body>''')
(OUT/'index.html').write_text(source,encoding='utf-8')
(OUT/'local.css').write_text('''/* Local recreation: suppress provider badges, including late runtime mounts. */
#__framer-badge-container, .__framer-badge,
a[title="Framer templates by Delani Studio"] { display: none !important; visibility: hidden !important; pointer-events: none !important; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
''',encoding='utf-8')
(OUT/'local.js').write_text('''/* Homepage-only snapshot: resolve other reference pages on the original site. */
(() => {
  const original = 'https://spartanai.framer.website';
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const value = link.getAttribute('href');
    if (!value || value.startsWith('#')) return;
    const url = new URL(value, location.href);
    if (url.origin !== location.origin || /\\.(png|jpe?g|svg|webp|avif|mp4|pdf)$/i.test(url.pathname)) return;
    if (url.pathname === '/' || url.pathname.endsWith('/index.html')) return;
    event.preventDefault();
    event.stopPropagation();
    location.href = original + url.pathname + url.search + url.hash;
  }, true);
})();
''',encoding='utf-8')
report={'source':'https://spartanai.framer.website/','resources':len(mapping),'modules':len(raw),'failures':failures}
(ROOT/'asset-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'resources':len(mapping),'modules':len(raw),'failures':len(failures),'bytes':sum(p.stat().st_size for p in ASSETS.iterdir())}),flush=True)
