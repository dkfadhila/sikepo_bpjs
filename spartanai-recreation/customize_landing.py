"""Apply SiKePO copy to the local template without changing media assets."""
from pathlib import Path
from html.parser import HTMLParser
import json, re, html

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'dist'
original = json.loads((ROOT / 'landing-original-text.json').read_text(encoding='utf-8'))
copy = {
0:'SIKEPO · Audit klaim lebih terarah',
1:'SIKEPO, klaim terjaga.',2:'Keputusan lebih tepat.',
3:'Investigasi kelayakan klaim dan pola overbilling BPJS/JKN, sebelum pencairan.',
4:'Buka dashboard',5:'Pipeline audit',6:'// A1 → A2 → A3',
7:'Aturan, machine learning, dan AI dalam satu alur pemeriksaan klaim.',
34:'SiKePO membantu verifikator menelusuri anomali finansial, klinis, dan administratif pada pengajuan klaim.',
38:'Tahap pemeriksaan: triage aturan, investigasi anomali, dan rekomendasi adjudikasi.',
39:'7',40:'fitur numerik',41:'Kelompok sinyal risiko yang menjadi fokus investigasi.',
43:'Skor risiko',44:'Skala 0–99 untuk membantu menentukan prioritas pemeriksaan.',
45:'Temuan aturan dan skor anomali dirangkum sebagai dasar penelusuran klaim yang lebih terarah.',
46:'ALUR AUDIT SIKEPO',47:'//SIKEPO',
48:'SiKePO menelaah rasio biaya INA CBG, durasi rawat, dan obat restriksi untuk membantu mengidentifikasi klaim yang perlu ditinjau.',
49:'FOKUS INVESTIGASI',50:'Upcoding',51:'A1 + A2',52:'Pemeriksaan',53:'ICD-10',54:'Acuan data',55:'HOLD',56:'Tindak lanjut',57:'Klinis',58:'Fokus audit',
59:'Phantom billing',60:'A1 + A3',61:'Resume',62:'Review',63:'Bukti',
64:'A1 + A2',65:'INA CBG',66:'Review',67:'Biaya',68:'Inflated bills',69:'A1 + A2',70:'Tarif',71:'Review',72:'Klaim',73:'Duplikasi klaim',74:'A1 + A3',75:'ID klaim',76:'Review',77:'Berkas',
78:'KAPABILITAS',79:'Dari berkas pengajuan hingga temuan yang dapat ditelusuri, SiKePO membantu menyusun prioritas review klaim.',
80:'SIKEPO UNTUK AUDIT KLAIM.',81:'Triage aturan dan kelayakan klaim',
82:'Periksa rasio biaya, durasi rawat, dan penggunaan obat restriksi sebagai langkah awal penilaian klaim.',
85:'Investigasi anomali multidimensi',87:'Rekomendasi adjudikasi AI',88:'SIKEPO',89:'Sistem investigasi klaim',90:'TUJUAN KAMI',
95:'SiKePO menggabungkan aturan pemeriksaan, deteksi anomali, dan ringkasan AI untuk membantu pengguna menelaah klaim sebelum pencairan.',
96:'SIKEPO MENYATUKAN TEMUAN FINANSIAL, KLINIS, DAN ADMINISTRATIF UNTUK MEMBANTU PRIORITAS PEMERIKSAAN KLAIM BPJS/JKN.',
97:'Pipeline audit SIKEPO',98:'Rasio biaya pengajuan terhadap tarif INA CBG',99:'Durasi rawat dibandingkan acuan diagnosis',100:'Obat restriksi dan pola pengajuan klaim',
101:'A1',102:'A2',103:'A3',104:'SA',105:'VK',106:'ST',107:'AU',108:'LOS',109:'ICD',110:'JKN',111:'Satu workspace untuk peran dan tahapan audit yang berbeda.',
112:'ALUR KERJA PENGGUNA',113:'Peran yang saling melengkapi untuk menelaah kelayakan dan pola risiko klaim.',
114:'Tinjau berkas pengajuan, telusuri temuan awal, dan catat keputusan sesuai kewenangan verifikasi.',
115:'VERIFIKATOR KC',116:'VK · Verifikasi klaim',
117:'Kelola pengguna, atur akses workspace, dan tinjau kebutuhan pengelolaan model serta keputusan audit.',
118:'SUPER ADMIN',119:'SA · Pengelolaan sistem',
120:'Dalami anomali dan hubungan antarberkas untuk menelaah pola pengajuan yang membutuhkan investigasi.',
121:'SATGAS ANTI FRAUD',122:'ST · Investigasi anomali',
123:'Pelajari alur pemeriksaan dan hasilnya melalui akses baca serta simulasi pada lingkungan sandbox.',
124:'AUDITOR',125:'AU · Review dan simulasi',
126:'Lihat hubungan antara berkas klaim, indikator risiko, dan temuan pemeriksaan dalam satu alur.',
127:'Alur audit klaim',128:'SIKEPO DALAM SATU ALUR.',129:'CARA KERJA',
130:'Dari berkas pengajuan ke rekomendasi yang dapat ditelusuri.',
132:'Masukkan data pengajuan klaim',133:'Data klaim',
134:'Data fasilitas kesehatan, diagnosis, biaya, durasi rawat, dan daftar obat menjadi konteks awal pemeriksaan kelayakan klaim.',
136:'Jalankan triage dan investigasi',138:'Rangkum temuan dan risiko',140:'Tinjau rekomendasi adjudikasi',
141:'SIKEPO MEMBANTU MENYUSUN SINYAL RISIKO MENJADI TEMUAN YANG DAPAT DITELUSURI DALAM PROSES AUDIT KLAIM.',
142:'Buka dashboard',143:'SATU WORKSPACE. EMPAT PERAN AUDIT.',
144:'Akses dan tanggung jawab disesuaikan dengan kebutuhan pengguna pada proses pemeriksaan klaim.',145:'Lihat peran',
146:'ST · Investigasi klaim',147:'Telusuri pola anomali, periksa temuan investigasi, dan dalami indikasi overbilling. Sinyal risiko membantu menentukan bagian berkas yang perlu diperiksa lebih lanjut.',
148:'VK · Verifikasi cabang',149:'Telaah klaim fasilitas kesehatan dalam lingkup cabang, cocokkan temuan dengan dokumen pendukung, dan catat keputusan sesuai kewenangan.',
150:'AU · Akses baca',151:'Pelajari hasil audit dan alur pemeriksaan melalui akses baca. Gunakan sandbox untuk memahami skenario klaim tanpa mengubah data operasional.',
152:'SA · Pengelolaan workspace',153:'Kelola pengguna, akses, pelatihan ulang model, dan peninjauan keputusan. Hak akses mengikuti peran agar pengelolaan sistem tetap terarah.',
154:'PERAN PENGGUNA',155:'Empat peran dengan lingkup akses dan tanggung jawab yang berbeda dalam proses audit klaim.',
156:'Super admin',157:'SA',158:'',159:'Akses berdasarkan peran',160:'Pengelolaan sistem dan pengguna.',161:'Lihat dashboard',162:'Manajemen pengguna',163:'Pengaturan hak akses',164:'Pelatihan ulang model',165:'Peninjauan keputusan',
166:'Verifikator',167:'VK',168:'Telaah dan verifikasi klaim.',169:'Klaim lingkup cabang',170:'Review berkas pengajuan',171:'Temuan pemeriksaan',172:'Catatan keputusan',
173:'Satgas',174:'ST',175:'Investigasi pola risiko.',176:'Analisis anomali',177:'Penelusuran pola klaim',178:'Investigasi mendalam',179:'Review indikasi fraud',
180:'Auditor',181:'AU',182:'Review dan eksplorasi sandbox.',183:'Akses baca',184:'Ringkasan hasil audit',185:'Simulasi sandbox',186:'Penelaahan alur audit',187:'Peran',188:'Akses',189:'(RBAC)',
190:'PERTANYAAN UMUM',191:'Kenali konteks data, tahapan pemeriksaan, dan fungsi rekomendasi pada SiKePO.',
192:'MENGENAL SIKEPO LEBIH DEKAT.',193:'Jelajahi dashboard',
194:'Apa yang diperiksa oleh SiKePO?',195:'SiKePO menelaah rasio biaya terhadap tarif INA CBG, durasi rawat, serta penggunaan obat restriksi untuk membantu menelusuri anomali klaim.',
196:'Bagaimana alur audit klaim bekerja?',197:'Data apa yang digunakan untuk pemeriksaan?',198:'Bagaimana skor risiko disusun?',199:'Apakah skor tinggi membuktikan fraud?',200:'Apa yang terjadi jika layanan AI tidak tersedia?',201:'Siapa yang dapat menggunakan SiKePO?',
202:'CATATAN SIKEPO',203:'Kenali pendekatan pemeriksaan klaim, fitur investigasi, dan konteks rekomendasi pada SiKePO.',204:'Jelajahi workspace',
205:'Pemeriksaan',206:'Rasio biaya dan tarif INA CBG pada audit klaim',207:'Pahami bagaimana selisih biaya menjadi salah satu sinyal untuk menelaah berkas lebih lanjut.',208:'Catatan',209:'SiKePO',
210:'Pipeline',211:'Tiga tahap pemeriksaan: aturan, anomali, dan AI',212:'Triage A1, investigasi A2, dan adjudikasi A3 menyusun temuan menjadi rekomendasi.',213:'SiKePO',
214:'Investigasi',215:'Menelaah indikasi upcoding dan pola overbilling',216:'Sinyal risiko perlu ditelusuri bersama diagnosis, rincian pelayanan, dan berkas pendukung.',217:'SiKePO',
218:'SiKePO — Sistem Investigasi Kelayakan Klaim & Pola Overbilling. Membantu pemeriksaan klaim BPJS/JKN sebelum pencairan.',
219:'Buka dashboard',220:'Buka dashboard untuk menjelajahi prototipe.',221:'WORKSPACE SIKEPO',222:'Navigasi',223:'Beranda',224:'Fokus risiko',225:'Catatan',226:'Tentang',227:'Tentang SiKePO',228:'Dashboard',229:'Lihat pipeline',230:'Peran pengguna',231:'Informasi',232:'Tentang prototipe',233:'Konteks data',234:'Fokus risiko',235:'Kapabilitas',236:'Dashboard',
}
translations = {original[i]: value for i, value in copy.items()}
translations.update({
'Automate the manual, accelerate the future. Our custom AI solutions deliver measurable growth and operational excellence.':'TELUSURI RISIKONYA. PAHAMI KLAIMNYA. SIKEPO MEMBANTU AUDIT KLAIM MENJADI LEBIH TERARAH.',
'We believe that AI should not just automate tasks, but amplify the creative and strategic potential of every human.':'SIKEPO MEMBANTU MENYATUKAN TEMUAN ATURAN DAN ANOMALI AGAR SETIAP KLAIM DAPAT DITELAAH DENGAN KONTEKS.',
'Initial neural audits take 1 week, followed by a 4-week rapid prototyping phase before full-scale production deployment.':'A1 menilai aturan awal, A2 mendeteksi anomali dengan IsolationForest, lalu A3 merangkum temuan menjadi rekomendasi adjudikasi.',
'SiKePo':'SiKePO',
})
# Exact string replacement keeps JavaScript identifiers and CSS untouched.
for file in [OUT/'index.html', *(OUT/'assets').glob('*.mjs')]:
    text=file.read_text(encoding='utf-8')
    before=text
    for old,new in sorted(translations.items(),key=lambda item:len(item[0]),reverse=True):
        if file.suffix=='.html':
            for encoded in {old,html.escape(old,quote=False),html.escape(old)}:
                text=text.replace('>'+encoded+'<','>'+html.escape(new,quote=False)+'<')
        else:
            for quote in ['`','"',"'"]:
                if quote not in old and quote not in new:
                    text=text.replace(quote+old+quote,quote+new+quote)
    if text!=before:file.write_text(text,encoding='utf-8')

# Supply domain-specific FAQ answers, including collapsed runtime variants.
faq = OUT/'assets'
answers=[
'A1 menilai aturan awal, A2 mendeteksi anomali dengan IsolationForest, lalu A3 merangkum temuan menjadi rekomendasi adjudikasi.',
'Berkas memuat fasilitas kesehatan, data pasien, diagnosis ICD-10, tarif INA CBG, biaya pengajuan, durasi rawat, dan daftar obat.',
'Rancangan pada handover menggabungkan risiko aturan A1 sebesar 45% dan risiko machine learning A2 sebesar 55%, pada skala 0–99.',
'Tidak. Skor merupakan sinyal untuk menentukan prioritas pemeriksaan. Indikasi perlu ditelaah bersama dokumen dan konteks pelayanan.',
'Handover menyediakan fallback deterministik jika layanan LLM tidak tersedia atau responsnya tidak dapat diproses.',
'Super admin, verifikator cabang, satgas anti fraud, dan auditor memiliki lingkup akses masing-masing.'
]
for f in faq.glob('jOQBHXGPX*.mjs'):
    s=f.read_text(encoding='utf-8')
    # FAQ entries use the same text property for the answer on every variant.
    positions=list(re.finditer(r'YCmlBfRJj:`([^`]*)`',s))
    unique=[]
    for m in positions:
        v=m.group(1)
        if v not in unique:unique.append(v)
    for old,new in zip(unique,[translations[original[195]],*answers]):
        s=s.replace('YCmlBfRJj:`'+old+'`','YCmlBfRJj:`'+new+'`')
    f.write_text(s,encoding='utf-8')

page=OUT/'index.html'
s=page.read_text(encoding='utf-8').replace('<html lang="en"','<html lang="id"')
s=re.sub(r'(<meta name="description" content=")[^"]*',r'\g<1>SiKePO membantu investigasi kelayakan klaim dan pola overbilling BPJS/JKN melalui triage aturan, deteksi anomali, dan rekomendasi AI.',s)
s=re.sub(r'<script type="application/ld\+json">.*?</script>','',s,flags=re.S)
if 'sikepo-branding.js' not in s:s=s.replace('</body>','<script src="sikepo-branding.js" defer></script>\n</body>')
page.write_text(s,encoding='utf-8')
(ROOT/'sikepo-copy.json').write_text(json.dumps(translations,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'sikepo-branding.js').write_text('''/* Local copy layer for CMS content and links. Media remain unchanged. */
(() => {
  const copy = '''+json.dumps(translations,ensure_ascii=False)+''';
  const phrases = Object.entries(copy).filter(([s]) => s.length > 60);
  let pending = false;
  function apply() {
    pending = false;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const changes = [];
    while(walker.nextNode()) {
      const node = walker.currentNode;
      if(node.parentElement?.closest('script,style')) continue;
      const value = node.nodeValue.trim();
      if(Object.prototype.hasOwnProperty.call(copy, value) && copy[value] !== value) changes.push([node, copy[value]]);
    }
    changes.forEach(([node,value]) => { node.nodeValue = value; });
    // SSR letter-reveal fragments carry the same full phrase as the runtime.
    document.querySelectorAll('div[style*="flex-wrap"]').forEach(el => {
      const text = el.textContent.replace(/\\s/g,'');
      const match = phrases.find(([old]) => old.replace(/\\s/g,'') === text);
      if(match) el.textContent = match[1];
    });
    document.querySelectorAll('h2,h3,h6').forEach(h => {
      const text=h.textContent.trim();
      if(text==='FOKUS INVESTIGASI') h.id='fokus-risiko';
      if(text==='CATATAN SIKEPO') h.id='catatan';
      if(text==='SATU WORKSPACE. EMPAT PERAN AUDIT.') h.id='tentang';
    });
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if(href && /(?:contra\\.com|cal\\.com|delani\\.pro)/.test(href)) a.setAttribute('href','/dashboard/');
      if(href && /(?:x\\.com|linkedin\\.com|instagram\\.com|youtube\\.com)/.test(href)) a.hidden=true;
    });
    document.querySelectorAll('form').forEach(form => {
      if(form.dataset.sikepoForm) return;
      form.dataset.sikepoForm='true';
      form.addEventListener('submit',e => { e.preventDefault();e.stopImmediatePropagation();location.href='/dashboard/'; },true);
      form.querySelectorAll('input').forEach(input => { input.required=false;input.hidden=true; });
    });
  }
  addEventListener('load', () => {
    apply();
    new MutationObserver(() => {
      if(!pending){pending=true;requestAnimationFrame(apply);}
    }).observe(document.querySelector('#main') || document.body,{subtree:true,childList:true});
  });
})();
''',encoding='utf-8')
