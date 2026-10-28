/* Authored React/Motion view; imports resolved by patch_framer_export.mjs. */
import{o as jsx,_ as useState,b as useRef,y as useEffect}from"./react.ChbYa_hz-588697fcd799.mjs?v=sikepo-source-sync-19";
import{t as initMotion,k as motion}from"./motion.BJNzOgT--7bad8bc7db93.mjs?v=sikepo-source-sync-19";
initMotion();
export const stackItems=[
  {
    "id": "render",
    "name": "Render",
    "group": "Infrastruktur & operasional",
    "role": "Tempat aplikasi berjalan.",
    "description": "Render menjalankan server Node.js SiKePO, menyajikan landing page, serta melayani API dan dashboard. Versi terbaru diterbitkan dari kode yang sudah masuk ke GitHub.",
    "detail": "Perubahan aplikasi diuji sebelum dipublikasikan. Render menangani proses build dan menjalankan layanan backend.",
    "url": "https://render.com/"
  },
  {
    "id": "cloudflare",
    "name": "Cloudflare",
    "group": "Infrastruktur & operasional",
    "role": "Menghubungkan domain dan layanan.",
    "description": "Cloudflare mengelola DNS sikepo.tech dan jalur akses dashboard.sikepo.tech. Worker meneruskan permintaan dashboard ke server aplikasi sambil menjaga alur sesi pengguna.",
    "detail": "Landing, login, dan dashboard memiliki alamat yang konsisten di bawah domain SiKePO.",
    "url": "https://www.cloudflare.com/"
  },
  {
    "id": "github",
    "name": "GitHub",
    "group": "Infrastruktur & operasional",
    "role": "Rumah kode dan riwayat perubahan.",
    "description": "Kode SiKePO disimpan di GitHub. Setiap perubahan dicatat melalui commit agar dapat ditinjau dan ditelusuri kembali.",
    "detail": "GitHub Actions menjalankan pengujian otomatis untuk membantu memeriksa perubahan sebelum deploy.",
    "url": "https://github.com/dkfadhila/sikepo_bpjs"
  },
  {
    "id": "sentry",
    "name": "Sentry",
    "group": "Infrastruktur & operasional",
    "role": "Membantu menemukan error aplikasi.",
    "description": "Sentry digunakan untuk memantau error backend SiKePO. Informasi kejadian membantu pengembang mencari sumber masalah pada aplikasi yang sudah berjalan.",
    "detail": "Pemantauan error mendukung pemeliharaan layanan; hasil audit klaim tetap ditinjau melalui workspace SiKePO.",
    "url": "https://sentry.io/"
  },
  {
    "id": "mastra",
    "name": "Mastra",
    "group": "AI & aplikasi",
    "role": "Mengatur alur kerja agent AI.",
    "description": "Mastra menghubungkan agent dan workflow penjelasan klaim. Konteks pengajuan diproses menjadi ringkasan terstruktur yang dapat digunakan di dashboard.",
    "detail": "Alur aplikasi memisahkan analisis dan validasi keluaran. Jika penjelasan tidak valid, pengguna dapat mencoba kembali.",
    "url": "https://mastra.ai/"
  },
  {
    "id": "huggingface",
    "name": "Hugging Face",
    "group": "AI & aplikasi",
    "role": "Tempat pelatihan dan penyimpanan artefak model.",
    "description": "Hugging Face Jobs menjalankan pelatihan Isolation Forest menggunakan korpus klaim sintetis SiKePO periode 2019–2025. Dataset dan artefak model disimpan di repositori privat.",
    "detail": "Pelatihan dilakukan pada CPU; data uji sintetis digunakan untuk evaluasi. Hasilnya menjadi prioritas pemeriksaan, bukan bukti fraud atau pengganti keputusan verifikator.",
    "url": "https://huggingface.co/"
  },
  {
    "id": "nalar",
    "name": "NALAR",
    "group": "AI & aplikasi",
    "role": "Model penjelasan klaim khusus SiKePO.",
    "description": "NALAR merupakan model bahasa khusus SiKePO yang disesuaikan untuk penelaahan klaim, penjelasan indikator risiko, dan penyusunan kebutuhan bukti pendukung.",
    "detail": "Model bahasa 4 miliar parameter ini dikembangkan melalui fine-tuning LoRA menggunakan 8.000 pasangan instruksi dan respons sintetis. NALAR dirancang untuk mengolah konteks klaim serta temuan pemeriksaan menjadi penjelasan terstruktur bagi penelaah. Keputusan akhir tetap berada pada pengguna yang berwenang.",
    "url": "https://sikepo.tech/data-methodology.html"
  },
  {
    "id": "nodejs",
    "name": "Node.js",
    "group": "AI & aplikasi",
    "role": "Menjalankan JavaScript di server.",
    "description": "Node.js menjadi runtime backend SiKePO. Server menjalankan API, koneksi database, pengelolaan sesi, serta panggilan workflow AI.",
    "detail": "Satu lingkungan server menghubungkan antarmuka aplikasi dengan penyimpanan data dan layanan AI.",
    "url": "https://nodejs.org/"
  },
  {
    "id": "express",
    "name": "Express",
    "group": "AI & aplikasi",
    "role": "Mengatur rute API dan akses aplikasi.",
    "description": "Express menangani permintaan web SiKePO, mulai dari halaman login hingga endpoint API. Middleware mengatur sesi, pembatasan permintaan, dan pemeriksaan akses.",
    "detail": "Pengguna masuk melalui panel login; akses dashboard mengikuti sesi dan peran yang diberikan.",
    "url": "https://expressjs.com/"
  },
  {
    "id": "mongodb",
    "name": "MongoDB Atlas",
    "group": "Data & antarmuka",
    "role": "Menyimpan data aplikasi.",
    "description": "MongoDB Atlas menjadi penyimpanan data SiKePO. Data aplikasi disimpan dalam database terpisah untuk mendukung alur pengguna dan workspace.",
    "detail": "MongoDB menyimpan klaim sintetis dan hasil review. Kumpulan data historis periode 2019–2025 dapat ditelusuri melalui workspace.",
    "url": "https://www.mongodb.com/atlas"
  },
  {
    "id": "framer",
    "name": "Framer",
    "group": "Data & antarmuka",
    "role": "Menghidupkan antarmuka landing page.",
    "description": "Runtime Framer mempertahankan animasi, ticker logo, transisi, dan interaksi landing page. Konten SiKePO disesuaikan melalui konfigurasi sumber komponen.",
    "detail": "Bagian teknologi ini memakai React dan Motion dari runtime Framer yang sama, termasuk animasi masuk serta respons saat logo dipilih.",
    "url": "https://www.framer.com/"
  },
  {
    "id": "bpjs",
    "name": "BPJS Kesehatan",
    "group": "Data & antarmuka",
    "role": "Konteks layanan dan pemeriksaan klaim JKN.",
    "description": "SiKePO dirancang untuk konteks penelaahan kelayakan klaim BPJS/JKN, termasuk diagnosis, biaya pengajuan, durasi rawat, obat, dan acuan tarif INA CBG.",
    "detail": "BPJS Kesehatan ditampilkan sebagai konteks domain layanan. SiKePO adalah prototipe; pencantuman logo tidak menyatakan kemitraan, dukungan, atau koneksi resmi ke sistem BPJS Kesehatan.",
    "url": "https://www.bpjs-kesehatan.go.id/"
  }
]
;
const icon=(item,full=false)=>jsx('img',{src:`/assets/stack/${item.id==='bpjs'&&!full?'bpjs-symbol':item.id}-white.png?v=sikepo-source-sync-19`,alt:item.name,width:full&&item.id==='bpjs'?188:48,height:48,loading:'lazy',decoding:'async'});
export function stackTickerItems(){return stackItems.map(item=>jsx('a',{href:'#teknologi',className:'sikepo-stack-ticker-logo',style:{width:item.id==='bpjs'?240:Math.max(170,item.name.length*15+86),height:54,flexShrink:0},'aria-label':item.name,title:item.name,children:[icon(item,true),item.id!=='bpjs'?jsx('span',{children:item.name}):null]},item.id));}
export function SikepoStack(){
 const [active,setActive]=useState(null),dialog=useRef(null),opener=useRef(null);
 useEffect(()=>{if(active&&!dialog.current.open)dialog.current.showModal();},[active]);
 function close(){dialog.current?.close();}
 function afterClose(){setActive(null);opener.current?.focus();}
 const reveal={initial:{opacity:0,y:24},whileInView:{opacity:1,y:0},viewport:{once:true,amount:.15},transition:{duration:.65,ease:[.22,1,.36,1]}};
 return jsx(motion.section,{...reveal,id:'teknologi',className:'sikepo-stack','aria-labelledby':'sikepo-stack-title',children:[
  jsx('div',{className:'sikepo-stack-heading',children:[jsx('p',{className:'sikepo-stack-eyebrow',children:'DI BALIK SIKEPO'}),jsx('h2',{id:'sikepo-stack-title',children:'Teknologi yang saling terhubung.'}),jsx('p',{children:'Dari aplikasi hingga infrastruktur. Pilih logo untuk mengenal perannya di SiKePO.'})]}),
  jsx('div',{className:'sikepo-stack-rows',children:[...new Set(stackItems.map(item=>item.group))].map((group,index)=>jsx(motion.div,{...reveal,className:'sikepo-stack-row',children:[jsx('div',{className:'sikepo-stack-row-label',children:[jsx('span',{children:`0${index+1}`}),jsx('h3',{children:group})]}),jsx('div',{className:'sikepo-stack-icons',children:stackItems.filter(item=>item.group===group).map(item=>jsx(motion.button,{type:'button',className:'sikepo-stack-icon','aria-label':`Tentang ${item.name}`,'aria-haspopup':'dialog',whileHover:{y:-5,backgroundColor:'#28372e'},whileTap:{scale:.96},transition:{duration:.2},onClick:event=>{opener.current=event.currentTarget;setActive(item);},children:[icon(item),jsx('span',{className:'sikepo-stack-tooltip',children:item.name})]},item.id))})]},group))}),
  jsx('dialog',{ref:dialog,className:'sikepo-stack-dialog','aria-labelledby':'sikepo-stack-dialog-title',onClose:afterClose,onClick:event=>{if(event.target===event.currentTarget)close();},children:active?jsx(motion.div,{className:'sikepo-stack-dialog-body',initial:{opacity:0,y:16},animate:{opacity:1,y:0},transition:{duration:.25},children:[jsx('button',{type:'button',className:'sikepo-stack-close','aria-label':'Tutup penjelasan',onClick:close,children:'×'}),jsx('div',{className:'sikepo-stack-dialog-logo',children:icon(active,true)}),jsx('p',{className:'sikepo-stack-eyebrow',children:active.group}),jsx('h2',{id:'sikepo-stack-dialog-title',children:active.name}),jsx('p',{className:'sikepo-stack-dialog-role',children:active.role}),jsx('p',{children:active.description}),jsx('p',{className:'sikepo-stack-detail',children:active.detail}),jsx('a',{href:active.url,target:'_blank',rel:'noopener noreferrer',className:'sikepo-stack-source',children:'Kunjungi situs ↗'})]},active.id):null})
 ]});
}
