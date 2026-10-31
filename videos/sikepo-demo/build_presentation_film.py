"""Capture the actual OpenSlide deck and compose its existing narration and footage."""
from pathlib import Path
import json, shutil, base64
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
PROJECT=ROOT/'videos/sikepo-demo/presentation-film'
ASSETS=PROJECT/'assets'
ASSETS.mkdir(exist_ok=True)
timing=json.loads((ROOT/'videos/sikepo-demo/narration/timing.json').read_text())
total=timing['totalSeconds']
presenter=ROOT/'videos/sikepo-demo/presenter'
for name in ['01-pre-demo','02-demo','03-after-demo']:
 shutil.copy2(presenter/'final'/f'{name}-720p.mp4', ASSETS/f'{name}.mp4')
shutil.copy2(ROOT/'slides/sikepo-pitch/assets/sikepo-demo.mp4',ASSETS/'demo.mp4')
shutil.copy2(ROOT/'slides/sikepo-pitch/assets/logo-white.png',ASSETS/'logo.png')
shutil.copy2(presenter/'master-neutral-v1.png',ASSETS/'presenter.png')
neutral='data:image/png;base64,'+base64.b64encode((ASSETS/'presenter.png').read_bytes()).decode()

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
 page.goto('http://localhost:5173/s/sikepo-pitch?p=1')
 page.get_by_text('Present',exact=True).click()
 for number in range(1,11):
  page.wait_for_timeout(700)
  page.evaluate('document.fonts.ready')
  canvas=page.locator('[data-osd-canvas="true"]')
  if number==1:
   # Replace the empty photo placeholder only in the captured video edition.
   canvas.evaluate('''(el,src)=>{const leaf=[...el.querySelectorAll('*')].find(e=>e.children.length===0&&e.textContent.includes('Foto asli Decka'));if(leaf){let box=leaf;while(box.parentElement&&box.getBoundingClientRect().width<500)box=box.parentElement;box.innerHTML='';box.style.cssText='width:570px;height:640px;position:relative;overflow:hidden;border-radius:18px';const img=new Image();img.src=src;img.style.cssText='width:100%;height:100%;object-fit:cover;object-position:50% 35%';box.append(img);const tag=document.createElement('span');tag.textContent='Visual presenter AI';tag.style.cssText='position:absolute;bottom:16px;left:18px;font:18px Arial;color:white;background:#181c19bb;padding:7px 12px;border-radius:8px';box.append(tag)}}''',neutral)
   page.wait_for_timeout(200)
  canvas.screenshot(path=str(ASSETS/f'slide-{number:02}.png'))
  print(f'Captured slide {number}',flush=True)
  if number<10: page.keyboard.press('ArrowRight')
 browser.close()

chapters=['Perkenalan','Ide & tujuan','Latar belakang','Pipeline A1 / A2 / A3','Demo aplikasi','Fitur aplikasi','ML & NALAR','Hasil pengujian','Studi kasus','Penutup']
slides=[]
for item in timing['slides']:
 n=item['page']; start=item['startSeconds']; duration=item['endSeconds']-start
 if n==5:
  content=f'<video id="demo" class="clip slide" src="assets/demo.mp4" data-start="{start}" data-duration="{duration}" data-track-index="1" muted playsinline></video>'
 else:
  content=f'<div id="slide-{n}" class="clip slide" data-start="{start}" data-duration="{duration}" data-track-index="1"><img id="image-{n}" src="assets/slide-{n:02}.png"></div>'
 slides.append(content)
 slides.append(f'<div id="chapter-{n}" class="clip chapter" data-start="{start}" data-duration="{duration}" data-track-index="4"><span>{n:02} / 10</span><p>{chapters[n-1]}</p></div>')
videos=[]
for i,block in enumerate(timing['blocks']):
 videos.append(f'<video id="presenter-{i}" class="clip face" data-start="{block["start"]}" data-duration="{block["end"]-block["start"]}" data-track-index="3" src="assets/{block["id"]}.mp4" data-has-audio="true" playsinline></video>')
html='''<!doctype html><html lang="id"><head><meta charset="utf-8"><script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script><style>
*{box-sizing:border-box;margin:0}html,body{width:1280px;height:720px;overflow:hidden;background:#141b16;font-family:Arial,sans-serif;color:#f0f0ee}
#root{position:relative;width:1280px;height:720px;background:#141b16}.slide{position:absolute;left:16px;top:42px;width:1040px;height:585px;overflow:hidden;border-radius:12px;background:#f0f0ee}.slide img{width:100%;height:100%;object-fit:contain}.slide video,video.slide{object-fit:contain}
.face{position:absolute;left:1072px;top:529px;width:192px;height:108px;border:2px solid #f3f4ef;border-radius:10px;overflow:hidden;box-shadow:0 5px 14px #0005}video.face{display:block;object-fit:cover}
.brand{position:absolute;left:1072px;top:44px;display:flex;align-items:center;gap:9px;font-size:23px;font-weight:bold}.brand img{width:28px;height:28px}.chapter{position:absolute;left:1072px;top:123px;width:184px;font-size:19px;line-height:1.4}.chapter span{font:13px monospace;color:#adc5b5}.chapter p{margin-top:17px}.name{position:absolute;left:1072px;top:652px;width:190px;font-size:13px;line-height:1.4;color:#d3dfd6}.progress{position:absolute;left:16px;top:647px;width:1040px;height:2px;background:#3d5445}.progress div{height:2px;background:#87b99a;width:100%;transform-origin:left}.credit{position:absolute;left:16px;top:668px;color:#a9bdb0;font-size:12px}
</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="TOTAL" data-width="1280" data-height="720">
CONTENT
<div id="brand" class="clip brand" data-start="0" data-duration="TOTAL" data-track-index="4"><img src="assets/logo.png">SIKEPO</div>
<div id="name" class="clip name" data-start="0" data-duration="TOTAL" data-track-index="4">Decka Fadhila Tirta<br><span style="color:#9bb4a4;font-size:11px">Presenter AI · narasi presentasi</span></div>
<div id="progress" class="clip progress" data-start="0" data-duration="TOTAL" data-track-index="4"><div id="progress-fill"></div></div>
<div id="credit" class="clip credit" data-start="0" data-duration="TOTAL" data-track-index="4">Coba namanya ini aja · SiKePo: investigasi kelayakan klaim dan pola overbilling berbasis AI</div>
</div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});tl.fromTo('#progress-fill',{scaleX:0},{scaleX:1,duration:TOTAL,ease:'none'},0);
ANIMATION
window.__timelines.main=tl;</script></body></html>'''
animations=[]
for item in timing['slides']:
 if item['page']!=5:
  animations.append(f"tl.fromTo('#image-{item['page']}',{{opacity:0,y:8}},{{opacity:1,y:0,duration:.26,ease:'power2.out'}},{item['startSeconds']});")
(PROJECT/'index.html').write_text(html.replace('TOTAL',str(total)).replace('CONTENT','\n'.join(slides+videos)).replace('ANIMATION','\n'.join(animations)),encoding='utf8')
(PROJECT/'BRIEF.md').write_text('''# SIKEPO presentation film
Combine the existing ten OpenSlide pages, edited dashboard demonstration, three continuous narration/presenter blocks, and rounded facecam. 1280×720, 30 fps, 417.213 seconds. Keep every slide element and demonstration detail visible by reserving a right-hand presenter rail. No new paid media or background music. Existing speech is the master clock. The photo placeholder is replaced in this video edition with the approved generated presenter, explicitly labelled as AI.
''',encoding='utf8')
(PROJECT/'SPEC.md').write_text('''# Layout
Canvas 1280×720. Existing slides/demo 1040×585 at (16,42); right rail 192 px. Facecam 192×108 at (1072,529), corner radius10px, border2px. Source audio drives ten exact chapter timings recorded in ../narration/timing.json. Slide entrances use a260ms fade and8px translation, matching the deck transition. Demo source is used once at its original duration86.633s. No nested browser controls or download scene. Voice remains unchanged.
''',encoding='utf8')
print(PROJECT,flush=True)
