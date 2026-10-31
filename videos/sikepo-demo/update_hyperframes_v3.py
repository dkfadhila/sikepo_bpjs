"""Keep the editable HyperFrames preview consistent with the new local export."""
from pathlib import Path
import json,re,shutil,html
ROOT=Path(__file__).resolve().parents[2]
PROJECT=ROOT/'videos/sikepo-demo/presentation-film'
data=json.loads((ROOT/'videos/sikepo-demo/narration-v3/slide-timing.json').read_text())
total=data['totalSeconds'];old=(PROJECT/'index.html').read_text(encoding='utf8')
style=re.search(r'<style>(.*?)</style>',old,re.S).group(1)
titles=['Perkenalan','Ide & tujuan','Latar belakang','Pipeline A1 & A2','Pipeline A3 / NALAR','Demo aplikasi','Fitur aplikasi','Pelatihan ML','Pelatihan NALAR','Hasil pengujian','Studi kasus','Penutup']
tags=[];animation=[]
for row,title in zip(data['slides'],titles):
 n=row['slide'];start=row['start'];dur=row['end']-start
 if n==6:tags.append(f'<video id="demo" class="clip slide" src="assets/demo.mp4" data-start="{start}" data-duration="{dur}" data-track-index="1" muted playsinline></video>')
 else:
  tags.append(f'<div id="slide-{n}" class="clip slide" data-start="{start}" data-duration="{dur}" data-track-index="1"><img id="image-{n}" src="assets-v2/slide-{n:02}.png"></div>')
  animation.append(f"tl.fromTo('#image-{n}',{{opacity:0,y:8}},{{opacity:1,y:0,duration:.26,ease:'power2.out'}},{start});")
 tags.append(f'<div id="chapter-{n}" class="clip chapter" data-start="{start}" data-duration="{dur}" data-track-index="4"><span>{n:02} / 12</span><p>{html.escape(title)}</p></div>')
start=0
for i,block in enumerate(data['blocks']):
 name=block['id'];shutil.copy2(ROOT/'videos/sikepo-demo/presenter/final-v3'/(name+'-720p.mp4'),PROJECT/'assets'/(name+'-v3.mp4'))
 tags.append(f'<video id="presenter-{i}" class="clip face" data-start="{start}" data-duration="{block["seconds"]}" data-track-index="3" src="assets/{name}-v3.mp4" data-has-audio="true" playsinline></video>');start+=block['seconds']
for ident,cls,content in [('brand','brand','<img src="assets/logo.png">SIKEPO'),('name','name','Decka Fadhila Tirta'),('progress','progress','<div id="progress-fill"></div>'),('credit','credit','Coba namanya ini aja · SiKePo: investigasi kelayakan klaim dan pola overbilling berbasis AI')]:
 tags.append(f'<div id="{ident}" class="clip {cls}" data-start="0" data-duration="{total}" data-track-index="4">{content}</div>')
page=f'''<!doctype html><html lang="id"><meta charset="utf-8"><script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script><style>{style}</style><body><div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="1280" data-height="720">'''+''.join(tags)+f'''</div><script>window.__timelines=window.__timelines||{{}};const tl=gsap.timeline({{paused:true}});tl.fromTo('#progress-fill',{{scaleX:0}},{{scaleX:1,duration:{total},ease:'none'}},0);'''+''.join(animation)+'''window.__timelines.main=tl;</script></body></html>'''
(PROJECT/'index.html').write_text(page,encoding='utf8')
print('HyperFrames updated: twelve slides, latest presenter and narration',flush=True)
