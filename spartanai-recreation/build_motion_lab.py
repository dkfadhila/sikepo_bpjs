"""Build an isolated, runtime-free motion experiment from the current landing SSR.

Run from the repository root. The production landing is never modified.
Requires beautifulsoup4 and html5lib in the local authoring environment only.
"""
from pathlib import Path
import json
import re
import hashlib
from bs4 import BeautifulSoup

DIST = Path(__file__).parent / 'dist'
OUT = DIST / 'motion-lab'
OUT.mkdir(exist_ok=True)
page = BeautifulSoup((DIST / 'index.html').read_text(encoding='utf-8'), 'html5lib')
profile = json.loads(page.find(id='__framer__appearAnimationsContent').string)
(OUT / 'motion-profile.json').write_text(json.dumps(profile, indent=2), encoding='utf-8')

for script in list(page.find_all('script')):
    script.decompose()
for link in list(page.select('link[rel="modulepreload"]')):
    link.decompose()
for link in page.select('link[href]'):
    href = link['href']
    if not href.startswith(('/', 'http', 'data:')):
        link['href'] = '/' + href
for link in page.select('link[rel="canonical"]'):
    link.decompose()
for link in page.select('a[href]'):
    href = link['href']
    if href.startswith('./'):
        link['href'] = '/' + href[2:]
    if link['href'].startswith('/#'):
        link['href'] = link['href'][1:]
    destination = link['href'].rstrip('/')
    anchors = {'/project': '#fokus-risiko', '/about': '#tentang', '/digital-brain': '#capabilities'}
    if destination in anchors:
        link['href'] = anchors[destination]
for meta in list(page.select('meta[name="robots"]')):
    meta.decompose()
page.head.append(page.new_tag('meta', attrs={'name': 'robots', 'content': 'noindex,nofollow'}))
page.html['data-motion-lab'] = 'true'

# Entrance state belongs to the replacement controller. All content stays readable
# when JavaScript is disabled or the browser requests reduced motion.
for element in page.select('[style]'):
    style = element['style']
    if re.search(r'(?:^|;)opacity:0(?:\.0*1)?(?:;|$)', style):
        style = re.sub(r'(^|;)opacity:0(?:\.0*1)?(?=;|$)', r'\1opacity:1', style)
    element['style'] = style

for selector in ['.framer-1g21kgg-container', '.framer-1qu0ub1-container', '.framer-1ord3gc-container', '.framer-amm35g-container', '.framer-qgjv11-container']:
    for element in list(page.select(selector)):
        element.decompose()

# Translate the split copy before splitting it again, so no observer needs to
# rewrite animated letter nodes while a scroll animation is running.
for selector, text in [
    ('.framer-epleic-container', 'Telusuri risikonya. Pahami klaimnya. SIKEPO membantu audit klaim menjadi lebih terarah.'),
    ('.framer-1iccwkb-container', 'SIKEPO membantu menyatukan temuan aturan dan anomali agar setiap klaim dapat ditelaah dengan konteks.'),
]:
    for container in page.select(selector):
        for paragraph in container.select('p[style*="flex-wrap"]'):
            paragraph.clear()
            paragraph.string = text
            paragraph['class'] = ['motion-text-reveal']

CAPS = [
    ('Triage aturan dan kelayakan klaim', 'Periksa rasio biaya, durasi rawat, dan penggunaan obat restriksi sebagai langkah awal penilaian klaim.', 'WTuFQeqWgOcQVCks16yKxgDaefI-e705699f4a3f.png'),
    ('Investigasi anomali multidimensi', 'Telusuri hubungan diagnosis, biaya, durasi rawat, dan obat untuk memahami pola pengajuan yang perlu ditinjau.', 'In0V7veBPGhnSUzXqR7lATUDvE-8452c990a9bd.png'),
    ('Rekomendasi adjudikasi AI', 'Rangkum temuan aturan dan anomali menjadi alasan serta rekomendasi yang dapat ditelaah oleh pengguna.', 'T1zAekOylQHr0GPPBMBKhmpUeI-243dd1c6a5a3.png'),
]
for n, container in enumerate(page.select('.framer-hg9nvs-container')):
    container.clear()
    group = page.new_tag('div', attrs={'class': 'motion-capabilities', 'aria-label': 'Kapabilitas SIKEPO'})
    for i, (title, text, art) in enumerate(CAPS):
        html = f'''<article class="motion-cap {'is-active' if i == 0 else ''}">
          <button class="motion-cap-trigger" aria-expanded="{'true' if i == 0 else 'false'}" aria-controls="cap-{n}-{i}"><span class="motion-cap-number">00{i+1}</span><span class="motion-cap-vertical">{title}</span><span class="motion-sr-only">{title}</span></button>
          <div class="motion-cap-content" id="cap-{n}-{i}" aria-hidden="{'false' if i == 0 else 'true'}"><h3>{title}</h3><p>{text}</p><div class="motion-cap-art"><img src="/assets/{art}" alt=""/><img class="motion-cap-lines" src="/assets/qWpzthqQ4FGQWP39IeKgah1OP8-be03d7e56c88.png" alt=""/></div></div>
        </article>'''
        group.append(BeautifulSoup(html, 'html.parser'))
    container.append(group)

ANSWERS = [
    'SiKePO menelaah rasio biaya terhadap tarif INA CBG, durasi rawat, serta penggunaan obat restriksi untuk membantu menelusuri anomali klaim.',
    'A1 melakukan triage aturan, A2 menyelidiki pola anomali, dan A3 merangkum konteks serta temuan untuk ditinjau oleh pengguna.',
    'Diagnosis, biaya pengajuan, tarif INA CBG, durasi rawat, dan daftar obat menjadi konteks awal. Dashboard demo menggunakan data simulasi.',
    'Rancangan SiKePO menggabungkan sinyal aturan dan anomali untuk membantu menyusun prioritas pemeriksaan. Skor perlu dibaca bersama alasan dan bukti pendukung.',
    'Tidak. Skor risiko adalah sinyal untuk penelaahan lebih lanjut. Kesimpulan memerlukan pemeriksaan bukti dan keputusan oleh pengguna yang berwenang.',
    'Temuan aturan dan data klaim tetap dapat ditelaah. Panel AI akan menunjukkan jika layanan tidak tersedia agar hasilnya tidak dianggap sebagai analisis AI yang berhasil.',
    'SiKePO menyediakan peran Super admin, Verifikator KC, Satgas anti fraud, dan Auditor, dengan lingkup akses sesuai tanggung jawab masing-masing.',
]
for i, old in enumerate(list(page.select('.framer-hYikM'))):
    title = old.select_one('h4').get_text(' ', strip=True)
    html = f'''<article class="motion-faq {'is-open' if i == 0 else ''}"><h4><button class="motion-faq-trigger" aria-expanded="{'true' if i == 0 else 'false'}" aria-controls="faq-answer-{i}">{title}<span class="motion-plus" aria-hidden="true"></span></button></h4><div class="motion-faq-panel" id="faq-answer-{i}"><div><p>{ANSWERS[i]}</p></div></div></article>'''
    old.replace_with(BeautifulSoup(html, 'html.parser'))

STEPS = [
    ('Masukkan data pengajuan klaim', 'Data klaim', 'Data fasilitas kesehatan, diagnosis, biaya, durasi rawat, dan daftar obat menjadi konteks awal pemeriksaan kelayakan klaim.'),
    ('Jalankan triage dan investigasi', 'Triage dan investigasi', 'Temuan aturan dan pola anomali membantu menentukan bagian pengajuan yang perlu ditelusuri lebih lanjut.'),
    ('Rangkum temuan dan risiko', 'Temuan dengan konteks', 'Telaah indikator risiko bersama data pengajuan dan alasan pemeriksaan dalam satu rangkuman.'),
    ('Tinjau rekomendasi adjudikasi', 'Penelaahan pengguna', 'Cocokkan rekomendasi dengan bukti pendukung, kemudian catat keputusan sesuai kewenangan pengguna.'),
]
for i, old in enumerate(list(page.select('.framer-AVG0P'))):
    title, label, text = STEPS[i % 4]
    html = f'''<article class="motion-step {'is-open' if i == 0 else ''}"><button class="motion-step-trigger" aria-expanded="{'true' if i == 0 else 'false'}" aria-controls="step-answer-{i}"><span>// 0{i+1}</span><span>{title}</span><span class="motion-step-dot"></span></button><div class="motion-step-panel" id="step-answer-{i}"><div><small>{label}</small><p>{text}</p></div></div></article>'''
    old.replace_with(BeautifulSoup(html, 'html.parser'))

# Retain the exported responsive layouts, cards and artwork. Hover variants are
# driven by our own events and CSS rather than React's variant engine.
for element in page.select('[data-highlight="true"]'):
    element['data-motion-hover'] = 'true'
for track in page.select('ul'):
    if track.select(':scope > .ticker-item') or 'framer-ighnd' in track.parent.get('class', []):
        track['data-motion-ticker'] = 'true'
        track['data-motion-speed'] = '25' if track.find_parent(class_='framer-15vldg4') else '30'

nav = '''<header class="motion-nav" data-motion-nav><a class="motion-nav-logo" href="/motion-lab/" aria-label="SIKEPO, beranda"><img src="/assets/sikepo-symbol-black.png" alt=""/></a><button class="motion-menu-toggle" aria-expanded="false" aria-controls="motion-menu" aria-label="Buka menu"><span></span><span></span></button><nav id="motion-menu" aria-label="Navigasi utama"><a href="#fokus-risiko">Fokus risiko</a><a href="#capabilities">Kapabilitas</a><a href="#pipeline">Pipeline</a><a href="#peran">Peran</a><a href="#tentang">Tentang</a></nav></header><a class="motion-dashboard" href="/login"><span aria-hidden="true">↗</span>Dashboard</a><aside class="motion-lab-tools" aria-label="Kontrol percobaan"><button data-motion-replay>Ulangi animasi</button><a href="/" target="_blank" rel="noopener">Versi Framer ↗</a></aside>'''
page.body.append(BeautifulSoup(nav, 'html.parser'))
css_version = hashlib.sha256((OUT / 'motion.css').read_bytes()).hexdigest()[:10]
js_version = hashlib.sha256((OUT / 'motion.js').read_bytes()).hexdigest()[:10]
page.head.append(page.new_tag('link', rel='stylesheet', href=f'/motion-lab/motion.css?v={css_version}'))
for src in ['/local.js?v=sikepo-responsive-1', '/sikepo-branding.js?v=sikepo-responsive-1', '/pipeline-mount.js?v=sikepo-responsive-1', f'/motion-lab/motion.js?v={js_version}']:
    page.body.append(page.new_tag('script', src=src, defer=True))
(OUT / 'index.html').write_text(str(page), encoding='utf-8')
print(f'Built {OUT / "index.html"}; Framer/React bootstrap scripts: 0')
