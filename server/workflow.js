import { claimSchema } from './agent.js';

const checks = {
  COST_RATIO:{title:'Biaya pengajuan',evidence:'Rincian biaya dan dasar tarif',action:'Cocokkan setiap komponen tagihan dengan tarif acuan.'},
  LONG_STAY:{title:'Durasi rawat',evidence:'Resume dan catatan harian perawatan',action:'Periksa dasar klinis untuk tambahan hari rawat.'},
  DRUG_EVIDENCE:{title:'Obat restriksi',evidence:'Resep, indikasi dan bukti pemberian obat',action:'Lengkapi bukti penggunaan obat restriksi.'},
  SERVICE_MISMATCH:{title:'Jumlah layanan',evidence:'Catatan tindakan dan rincian layanan',action:'Rekonsiliasi layanan ditagihkan dengan layanan terdokumentasi.'},
  BILLING_MISMATCH:{title:'Total tagihan',evidence:'Invoice dan rincian biaya',action:'Rekonsiliasi total invoice dengan nilai pengajuan.'},
  DUPLICATE:{title:'Duplikasi episode',evidence:'Referensi episode dan pengajuan terkait',action:'Periksa apakah pengajuan merujuk episode pelayanan yang sama.'},
};
export function routeClaim(c) {
  if(c.score>=70 || c.signals.some(s=>['DUPLICATE','SERVICE_MISMATCH','BILLING_MISMATCH'].includes(s.code))) return {code:'INVESTIGATE',label:'Perlu investigasi',reason:'Terdapat sinyal yang perlu direkonsiliasi oleh pemeriksa.'};
  if(c.signals.length || c.ml.isAnomaly) return {code:'REQUEST_EVIDENCE',label:'Perlu pemeriksaan bukti',reason:'Indikator aturan atau model memerlukan pemeriksaan dokumen.'};
  return {code:'READY_FOR_REVIEW',label:'Siap ditelaah verifikator',reason:'Tidak ada indikator terpicu; kelengkapan dan kelayakan tetap diperiksa.'};
}
export function nalarInput(c) {
  return claimSchema.parse({id:c.id,amount:c.amount,tariff:c.tariff,los:c.los,normalLos:c.normalLos,score:c.score,
    signals:c.signals.map(s=>s.code),mlAnomaly:c.ml.isAnomaly,recommendation:c.recommendation});
}
export function explainClaim(c, generated) {
  return {...generated,recommendation:c.recommendation,requiresHumanDecision:true,route:routeClaim(c),
    findings:c.signals.map(s=>({code:s.code,title:checks[s.code].title,finding:s.text,
      evidence:checks[s.code].evidence,action:checks[s.code].action})),
    measurements:{costRatio:c.amount/c.tariff,amount:c.amount,tariff:c.tariff,los:c.los,normalLos:c.normalLos,
      serviceCount:c.serviceCount,documentedServiceCount:c.documentedServiceCount,invoiceTotal:c.invoiceTotal,duplicateCount:c.duplicateCount},
    ml:{rawScore:c.ml.rawScore,threshold:c.ml.threshold,isAnomaly:c.ml.isAnomaly,priority:c.score},
    limits:['Skor risiko bukan probabilitas fraud.','Temuan dan penjelasan tidak menetapkan persetujuan atau penolakan.','Aturan dan model saat ini dievaluasi pada skenario sintetis.'],
    explanationMethod:'Ringkasan dihasilkan NALAR; angka, bukti dan tindak lanjut disusun dari indikator terverifikasi.',
  };
}
export async function reserveAiBudget(db, limit=20) {
  const day=new Date().toISOString().slice(0,10),budget=db.collection('ai_budget');
  await budget.updateOne({_id:day},{$setOnInsert:{count:0,expiresAt:new Date(Date.now()+3*86400000)}},{upsert:true});
  return Boolean(await budget.findOneAndUpdate({_id:day,count:{$lt:limit}},{$inc:{count:1}},{returnDocument:'after'}));
}
