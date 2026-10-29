let sikepoIdentity;
document.querySelectorAll('.brand,.landing-link').forEach(link=>{link.href=location.hostname==='dashboard.sikepo.tech'?'https://sikepo.tech/':'/';});
const roleNames={SA:'Super admin',VK:'Verifikator KC',ST:'Satgas anti fraud',AU:'Auditor'};
async function loadIdentity(){try{const response=await fetch('/api/auth/me',{cache:'no-store'});if(response.status===401){location.replace(location.hostname==='localhost'||location.hostname==='127.0.0.1'?'/login':'https://sikepo.tech/login');return;}if(!response.ok)throw new Error();sikepoIdentity=await response.json();const user=sikepoIdentity.user;document.querySelector('.profile strong').textContent=user.name;document.querySelector('.profile small').textContent=roleNames[user.role];document.querySelectorAll('.avatar').forEach(el=>el.textContent=user.role);const logout=document.createElement('button');logout.className='text-button';logout.textContent='Keluar dari workspace';logout.addEventListener('click',async()=>{logout.disabled=true;try{const result=await fetch('/api/auth/logout',{method:'POST',headers:{'X-CSRF-Token':sikepoIdentity.csrf}});if(result.ok){const body=await result.json();location.assign(body.redirect);}else{logout.disabled=false;logout.textContent='Coba keluar lagi';}}catch{logout.disabled=false;}});document.querySelector('.sidebar-bottom').append(logout);}catch{const notice=document.createElement('p');notice.textContent='Sesi belum dapat diverifikasi. Muat ulang halaman.';notice.setAttribute('role','alert');document.querySelector('main').prepend(notice);}}

loadIdentity().then(()=>mountNalar());
const detailBody=document.querySelector('#detail-body');
let nalarTimer;
function node(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
function renderNalar(output,result){
 output.replaceChildren();output.append(node('h3','Penjelasan NALAR'));
 const route=node('div',null,'nalar-route');route.append(node('strong',result.route?.label||'Perlu review'),node('p',result.route?.reason||'Periksa bukti sebelum menetapkan keputusan.'));output.append(route);
 output.append(node('h4','Ringkasan AI'),node('p',result.summary,'nalar-summary'));
 if(result.measurements){const m=result.measurements,grid=node('div',null,'nalar-measurements');
 for(const [label,value] of [['Rasio biaya',m.costRatio.toFixed(2)+'× acuan'],['Durasi rawat',m.los+' / '+m.normalLos+' hari'],['Skor anomali',result.ml.rawScore.toFixed(4)],['Ambang model',result.ml.threshold.toFixed(4)]]){const cell=node('div');cell.append(node('small',label),node('strong',value));grid.append(cell);}output.append(grid);}
 output.append(node('h4','Temuan dan bukti yang diperiksa'));
 if(result.findings?.length){const findings=node('div',null,'nalar-findings');for(const f of result.findings){const card=node('article',null,'nalar-finding');card.append(node('h5',f.title),node('p',f.finding));const dl=node('dl');dl.append(node('dt','Bukti'),node('dd',f.evidence),node('dt','Tindak lanjut'),node('dd',f.action));card.append(dl);findings.append(card);}output.append(findings);}
 else{output.append(node('p','Tidak ada indikator aturan terpicu. Periksa kelengkapan dokumen; hasil ML tetap menjadi bahan review.'));const ul=node('ul');for(const text of result.checks||[])ul.append(node('li',text));output.append(ul);}
 output.append(node('h4','Hasil machine learning'),node('p',result.ml?.isAnomaly?'Model mendeteksi anomali. Cocokkan dengan bukti pengajuan.':'Model tidak menandai anomali. Kelengkapan dan kelayakan tetap perlu diperiksa.'));
 const limits=node('div',null,'nalar-limits');for(const text of result.limits||[])limits.append(node('p',text));output.append(limits,node('small',result.explanationMethod||'NALAR 4B · Verifikasi manusia diperlukan.','nalar-provenance'));
}
async function mountNalar(){
 const title=detailBody.querySelector('#detail-title');if(!title||detailBody.querySelector('[data-ai-output]')||!sikepoIdentity)return;
 clearTimeout(nalarTimer);const id=title.textContent,output=node('section',null,'nalar-panel');output.dataset.aiOutput='';output.setAttribute('aria-live','polite');detailBody.insertBefore(output,detailBody.querySelector('.review-form'));
 const current=()=>output.isConnected&&detailBody.querySelector('#detail-title')?.textContent===id;
 const button=node('button','Muat penjelasan NALAR','button black');button.type='button';button.dataset.aiExplain='';
 async function fetchExplanation(){button.disabled=true;output.replaceChildren(node('p','NALAR menelaah indikator klaim…'));try{const response=await fetch('/api/investigate',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':sikepoIdentity.csrf},body:JSON.stringify({id})});const result=await response.json();if(!response.ok)throw Error(result.error);if(!current())return;if(result.pending){output.replaceChildren(node('h3','Pemeriksaan otomatis'),node('p',result.message));button.disabled=false;return;}renderNalar(output,result);button.hidden=true;}catch(error){if(current()){output.replaceChildren(node('h3','Penjelasan belum tersedia'),node('p',error.message));button.disabled=false;button.textContent='Coba penjelasan NALAR lagi';}}}
 async function refresh(){try{const response=await fetch('/api/claims/'+encodeURIComponent(id),{cache:'no-store'});if(!response.ok)throw Error('Status pemeriksaan belum dapat dimuat.');const claim=await response.json();if(!current())return;
 if(claim.pipeline?.explanation){renderNalar(output,claim.pipeline.explanation);return;}
 if(claim.intake){output.replaceChildren(node('h3','Pemeriksaan otomatis'),node('p','Aturan dan ML sudah diperiksa.'),node('p',claim.pipeline?.message||({queued:'Menunggu antrean NALAR.',processing:'NALAR sedang diproses.',completed:'Pemrosesan selesai.',failed:'NALAR belum berhasil. Hasil aturan dan ML tetap tersedia.'}[claim.pipeline?.state]||'Menunggu layanan NALAR.')));if(!['failed','completed'].includes(claim.pipeline?.state)&&document.querySelector('#claim-dialog[open]'))nalarTimer=setTimeout(refresh,5000);return;}
 output.replaceChildren(node('h3','Penjelasan NALAR'),node('p','Data arsip sudah memiliki hasil aturan dan ML. Muat NALAR untuk memeriksa ringkasannya.'));
 if(sikepoIdentity.user.role!=='AU'){output.append(button);button.addEventListener('click',fetchExplanation);}else output.append(node('p','Penjelasan baru dapat diminta oleh verifikator atau tim investigasi.'));
 }catch(error){if(current())output.replaceChildren(node('p',error.message));}}
 void refresh();
}
new MutationObserver(mountNalar).observe(detailBody,{childList:true});
