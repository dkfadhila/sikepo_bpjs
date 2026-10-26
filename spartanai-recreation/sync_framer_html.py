"""Match initial SSR to the patched component source; never remove Framer motion."""
from pathlib import Path
from copy import deepcopy
import json
import re
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent
DIST = ROOT / 'dist'
VERSION = 'sikepo-source-sync-4'
page = BeautifulSoup((DIST / 'index.html').read_text(encoding='utf-8'), 'html5lib')
page.select_one('#main')['data-sikepo-client-render'] = 'true'
copy = json.loads((ROOT / 'sikepo-copy.json').read_text(encoding='utf-8'))

for node in page.find_all(string=True):
    if node.parent.name in ['script', 'style']:
        continue
    text = str(node).strip()
    if text in copy and copy[text] != text:
        node.replace_with(copy[text])

for selector, text in [
    ('.framer-epleic-container', 'Telusuri risikonya. Pahami klaimnya. SIKEPO membantu audit klaim menjadi lebih terarah.'),
    ('.framer-1iccwkb-container', 'SIKEPO membantu menyatukan temuan aturan dan anomali agar setiap klaim dapat ditelaah dengan konteks.'),
]:
    for container in page.select(selector):
        for paragraph in container.select('p[style*="flex-wrap"]'):
            # Match Text_Opacity_Letters' word/letter structure and first-13 rule.
            paragraph.clear()
            count = 0
            for word in text.split():
                wrapper = page.new_tag('span')
                for char in word:
                    span = page.new_tag('span')
                    span['style'] = 'color:inherit' if count < 13 else 'color:rgba(127,127,127,.1)'
                    span.string = char
                    wrapper.append(span)
                    count += 1
                wrapper.append('\u00a0')
                count += 1
                paragraph.append(wrapper)

summary = BeautifulSoup((ROOT / 'sikepo-summary.html').read_text(encoding='utf-8'), 'html.parser').div
old = page.select_one('.framer-ntzpvd')
if old:
    for existing in list(page.select('.sikepo-summary')):
        existing.decompose()
    old.replace_with(summary)

if not page.select_one('#capabilities > #pipeline'):
    section = BeautifulSoup((DIST / 'pipeline-section.html').read_text(encoding='utf-8'), 'html.parser').section
    page.select_one('#capabilities > .framer-1oh96en').insert_after(section)
for template in list(page.select('template#sikepo-pipeline-template')):
    template.decompose()

for nav in page.select('.framer-TFhzF'):
    link = nav.select_one('.framer-vjofyj,.framer-pipeline-nav')
    if link:
        link['class'] = [c.replace('framer-vjofyj', 'framer-pipeline-nav') for c in link['class']]
        link['href'] = '#pipeline'
        for p in link.select('.framer-text'):
            p.string = 'Pipeline'
for selector, name in [('.framer-1h8eal1', 'fokus-risiko'), ('.framer-16mkske', 'tentang')]:
    for element in page.select(selector):
        element['id'] = name

destinations = {'/contact': '/login', '/about': '/#tentang', '/project': '/#fokus-risiko', '/digital-brain': '/#pipeline'}
for link in page.select('a[href]'):
    href = link['href']
    path = ('/' + href[2:]) if href.startswith('./') else href
    if path in destinations:
        link['href'] = destinations[path]
    elif re.match(r'https://(?:contra\.com|cal\.com|delani\.pro)(?:/|$)', href):
        link['href'] = '/#pipeline' if 'cal.com' in href else '/#peran' if 'delani.pro' in href else '/login'
    elif '/#pricing' in path:
        link['href'] = '#peran'

for form in list(page.select('.framer-4474yi')):
    button = deepcopy(page.select_one('.framer-1epupqn-container a.framer-vm9ze'))
    if button:
        button['href'] = '/login'
        button['style'] = button.get('style', '') + ';width:220px;max-width:100%'
        form.replace_with(button)
for socials in list(page.select('.framer-3z8se7')):
    socials.decompose()

for script in list(page.select('script[src]')):
    if any(name in script['src'] for name in ['sikepo-branding.js', 'pipeline-mount.js']):
        script.decompose()
for script in page.select('script#__framer__handoverData'):
    def translate(value):
        if isinstance(value, str): return copy.get(value, value)
        if isinstance(value, list): return [translate(item) for item in value]
        if isinstance(value, dict): return {key: translate(item) for key, item in value.items()}
        return value
    script.string = json.dumps(translate(json.loads(script.string)), ensure_ascii=False, separators=(',', ':'))

html = str(page)
html = re.sub(r'\?v=sikepo-[a-zA-Z0-9-]+', '?v=' + VERSION, html)
html = html.replace('framer-vjofyj', 'framer-pipeline-nav')
(DIST / 'index.html').write_text(html, encoding='utf-8')
print('SSR synchronized; source renders Summary, Pipeline, navbar and footer CTA.')
