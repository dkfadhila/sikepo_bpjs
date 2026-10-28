# SiKePO — kebutuhan data dan metodologi dataset submission

Versi dataset: `sikepo-operational-3.0`. Sumber: **sepenuhnya sintetis**. Dataset ini bukan data BPJS yang dimasking atau dianonimkan, bukan data peserta JKN, dan bukan hasil pelatihan terhadap rekam medis. Aplikasi dapat diakses dan menjalankan autentikasi, pemuatan data API, penghitungan indikator, pencarian, filter, ekspor, serta penjelasan Gemma apabila layanan tersedia. Ketersediaan aplikasi berbeda dari validasi untuk penggunaan operasional BPJS.

## 1. Data yang dibutuhkan

| Kelompok | Elemen minimum | Tujuan | Tersedia dalam submission |
| --- | --- | --- | --- |
| Pengajuan | ID klaim internal, episode, tanggal pengajuan | Penelusuran dan kelompok periode | `id`, `episodeId`, `date`, `daysAgo` |
| Fasilitas | Kode fasilitas, kelas fasilitas, wilayah umum | Perbandingan konteks pelayanan | `facilityId`, `facility`, `type`, `city`; semuanya fiktif |
| Klinis terstruktur | Kode diagnosis ICD-10, lama rawat, acuan lama rawat | Menelaah konteks dan durasi | `icd`, `diagnosis`, `los`, `normalLos` |
| Finansial | Nilai pengajuan, tarif pembanding, total rincian tagihan | Rasio biaya dan ketidaksesuaian total | `amount`, `tariff`, `invoiceTotal`, rupiah |
| Pelayanan | Jumlah layanan ditagihkan dan didukung dokumen | Selisih bukti pelayanan | `serviceCount`, `documentedServiceCount` |
| Obat | Penggunaan obat restriksi, keberadaan bukti pendukung | Prioritas review kelengkapan | `restrictedDrug`, `drugEvidence`; boolean |
| Duplikasi | ID episode yang sama dan jumlah pengajuan terkait | Penanda pengajuan berulang | `episodeId`, `duplicateCount` |
| Keluaran | Kode indikator, bobot, versi aturan, skor, status review | Hasil yang dapat ditelusuri | Dihitung server: `signals`, `score`, `status`, `assessmentVersion` |
| Evaluasi | Label skenario yang sengaja disisipkan | Memeriksa generator dan cakupan kasus | `injectedScenario` di arsip historis privat; tidak dikirim ke dashboard atau menjadi fitur model |

Untuk integrasi operasional selanjutnya diperlukan rincian item layanan (kode, kuantitas, harga satuan, waktu pelayanan), tindakan ICD-9-CM, kelompok INA-CBG dan severity, kelas perawatan, tarif resmi beserta versi/tanggal berlakunya, bukti pelayanan terstruktur, ketentuan restriksi obat yang berlaku, dan hasil review berotorisasi. Resume medis/free text, tanggal lahir, alamat, dan identitas peserta **tidak dikumpulkan** oleh submission ini. Untuk model ML yang tervalidasi diperlukan data pembanding yang diperoleh secara sah, definisi label yang disepakati, serta hasil adjudikasi manusia; label skenario sintetis bukan pengganti ground truth fraud.

## 2. Pembuatan dan penyimpanan dataset

Generator `ml/hf_train_historical.py` menghasilkan 5.000.000 baris sepenuhnya sintetis di Hugging Face CPU, seed `2802025`, tanggal 1 Januari 2019 sampai 31 Desember 2025. Tidak ada tanggal layanan 2026. Variasi mencakup 1.500 fasilitas fiktif, 38 wilayah sintetis, 24 kode diagnosis, serta delapan skenario: baseline, biaya/durasi, bukti obat, selisih layanan, selisih tagihan, duplikasi, campuran dan borderline. Komposisi bukan estimasi prevalensi fraud. Tarif dan acuan klinis merupakan asumsi pengujian, bukan ketentuan BPJS.

Korpus penuh disimpan sebagai tujuh arsip tahunan gzip di Hugging Face privat. Seluruh baris, checksum, schema tanpa identitas peserta, keunikan ID dan konsistensi episode telah diaudit. Dashboard memakai irisan 10.000 klaim Desember 2025 dengan tanggal acuan 31 Desember 2025. Jumlah duplikasi mengacu korpus penuh; pasangan bisa berada di luar irisan aktif.

MongoDB menyimpan irisan aktif di `claims`; arsip 5 juta baris diimpor bertahap ke `historical_claims_v3` dengan field ringkas. Indeks tahun dan ID mendukung pagination cursor. Progres per tahun tersedia di `historical_imports`, dan klaim baru hanya dianggap lengkap setelah jumlah MongoDB cocok dengan manifest. Proses dapat dilanjutkan setelah terputus tanpa menduplikasi data. Data mentah serta backup tetap privat di Hugging Face. Metadata dan artefak audit disimpan di MongoDB/GridFS privat.

Dashboard menyediakan menu Arsip historis berdasarkan tahun dan pencarian ID lengkap; skor aturan dan ML dihitung ketika klaim dibuka. Ringkasan memiliki pilihan antrean aktif, seluruh klaim dalam 30 hari terakhir, per tahun, atau seluruh periode 2019–2025. Statistik historis dihitung dari seluruh arsip ke agregat harian, dengan perubahan review diterapkan secara langsung. Keputusan arsip dan irisan operasional menggunakan satu riwayat di `historical_reviews_v3`, berdasarkan identitas sumber yang sama. Dashboard operasional membaca halaman klaim, pencarian, filter, urutan dan ringkasan melalui API MongoDB. Ekspor menggunakan cursor database. Data tidak diunduh 10.000 baris sekaligus ke browser. Tidak ada fallback diam-diam ke JSON apabila database gagal.

Reproduksi historis tercatat pada `docs/HF-TRAINING.md`. Unduh artefak privat ke `artifacts/hf-audit`, jalankan `node scripts/audit-hf-model.mjs`, `python scripts/audit-hf-dataset.py`, `python scripts/promote-hf-model.py`, lalu `npm run data:import`. Untuk arsip historis gunakan `node scripts/import-history.mjs` dari direktori dengan arsip HF terverifikasi; script menyimpan checkpoint dan tidak menimpa hasil review. Hitung agregat menggunakan `node scripts/build-historical-summary.mjs`; migrasikan review lama dengan `node scripts/migrate-reviews.mjs` setelah memeriksa konflik. Promosi mensyaratkan kedua audit lulus. Generator/trainer lama hanya menulis eksperimen di `artifacts`, tidak menimpa model aktif. Credential berada dalam environment privat.

## 3. Pipeline aturan, machine learning dan rekomendasi

### A1 — aturan aplikasi

Server memeriksa rasio biaya >1,3 kali acuan (bobot 30), durasi >acuan+2 hari (20), obat restriksi tanpa bukti (25), jumlah layanan tidak cocok (35), total tagihan tidak cocok (25), dan pengajuan berulang pada episode yang sama (45). Jumlah bobot dibatasi 99. Ini heuristik aplikasi, bukan peraturan adjudikasi BPJS.

### A2 — model yang benar-benar dilatih

Isolation Forest scikit-learn memakai 200 pohon, maksimum 512 sampel per pohon, random seed `2802025`. Fitur: rasio biaya, rasio lama rawat, indikator bukti obat hilang, rasio selisih jumlah layanan, rasio selisih tagihan, jumlah pengajuan episode, dan log tarif. Nama, kode diagnosis, ID, label skenario, skor aturan, dan status keputusan tidak menjadi fitur model.

Pembagian waktu: train 2019-2023 sebanyak 3.105.497, kalibrasi 2024 sebanyak 912.883, test pengembangan 2025 sebanyak 981.620. Pasangan episode mewarisi tanggal sama tanpa kebocoran antarsplit. Ambang 0,39587304792183614 ditentukan dari persentil ke-95 baris tanpa injeksi di validasi, bukan test.

Hasil test sintetis: precision 87,86%, recall 92,29%, F1 90,02%, ROC-AUC 0,9826; TN 651.774, FP 37.322, FN 22.541, TP 269.983. Perhitungan independen atas seluruh 981.620 baris test dari pohon ekspor menghasilkan confusion matrix sama. Ini bukan validasi fraud nyata atau benchmark klinis independen.

Inferensi Node cocok dengan 200 fixture scikit-learn pada toleransi 1e-12. Kasus normal, biaya/durasi, duplikasi, selisih layanan/tagihan dan bukti obat lulus. Artefak JSON dimuat server tanpa Python atau training ulang saat restart. Laporan dan checksum tersimpan di `ml/artifacts`.

Skor ML tampilan = clamp(50 + 250 × (skor anomali mentah − ambang), 0, 99). Prioritas gabungan = maksimum antara skor aturan dan (45% skor aturan + 55% prioritas ML), dibulatkan. Ini indeks prioritas, bukan probabilitas fraud. Status awal `HOLD` bila aturan terpicu atau model mendeteksi anomali; lainnya `PENDING`.

### A3 — Gemma melalui Mastra, lalu keputusan manusia

Gemma yang sudah tersedia dikonfigurasi sebagai asisten pra-approval, bukan LLM baru yang dilatih dari nol. Browser mengirim ID; server mengambil klaim dari MongoDB dan mengirim angka sintetis terpilih, kode indikator, flag anomali dan rekomendasi. Workflow Mastra menghasilkan penjelasan dan daftar bukti dalam JSON tervalidasi. Server menetapkan rekomendasi `REQUEST_EVIDENCE` atau `READY_FOR_VERIFIER`; keluaran LLM tidak dapat menggantinya atau mengubah status klaim.

Verifikator/super admin dapat menyimpan `APPROVED`, `HOLD` atau `REJECTED` dengan catatan minimal 10 karakter. Hak akses dan CSRF diperiksa server. Review menggunakan versi optimistis agar perubahan bersamaan tidak saling menimpa. Status, aktor, waktu, alasan, dan status sebelumnya disimpan dalam satu update atomik dengan riwayat review pada dokumen klaim. Auditor dan satgas tidak dapat memutuskan status. Tidak ada pembayaran otomatis.

## 4. Pelindungan data dan batas penggunaan

UU No. 27 Tahun 2022 Pasal 4 menempatkan data dan informasi kesehatan sebagai data pribadi spesifik. Submission memilih pembuatan data baru dari nol sehingga tidak memproses rekam kesehatan peserta. Ini mengurangi kebutuhan dan risiko pemrosesan data peserta; **bukan pernyataan sertifikasi atau jaminan kepatuhan menyeluruh**. Email akun dan sesi autentikasi tetap perlu dikelola sebagai data akun.

Tidak ada proses masking dalam pembuatan dataset ini karena tidak ada data asli sebagai bahan. Apabila data asli akan digunakan kelak, mengganti nama/NIK atau hashing ID saja merupakan pseudonimisasi dan belum membuktikan anonimitas. Tetapkan dasar pemrosesan dan tujuan bersama pengendali data, minimalkan kolom, pisahkan kunci penghubung, batasi akses/retensi, lakukan penilaian risiko identifikasi ulang atas kombinasi diagnosis langka, tanggal dan fasilitas, serta kaji dampak pelindungan data sesuai konteks sebelum mengubah jalur data. Jangan unggah data asli ke repositori atau layanan AI lewat jalur submission.

Sentry dikonfigurasi tanpa PII default; body, cookie, query, header, dan user dihapus dari event error. Dataset kesehatan asli tidak ditambahkan ke log. Akun evaluasi bersama digunakan untuk reviewer submission; akun tersebut bukan kontrol akses yang memadai untuk data kesehatan operasional.

## 5. Narasi submission

“SiKePO adalah aplikasi investigasi klaim yang dapat diakses dengan autentikasi berbasis peran. Submission menggunakan 10.000 klaim sepenuhnya sintetis di MongoDB, dengan arsip dan artefak model pada GridFS privat. Aturan aplikasi dan Isolation Forest terlatih menyusun prioritas pemeriksaan. Mastra dan Gemma menjelaskan rekomendasi serta kebutuhan bukti; verifikator tetap menyimpan keputusan akhir beserta riwayatnya. Tidak ada data peserta JKN atau rekam medis asli yang digunakan. Nilai biaya dan durasi merupakan skenario; performa model yang dilaporkan hanya hasil evaluasi sintetis, bukan validasi klinis atau BPJS.”

## Rujukan

- UU No. 27 Tahun 2022: https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/crc32/
- Prinsip evaluasi identifiability (referensi teknis, bukan hukum Indonesia): https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/how-do-we-ensure-anonymisation-is-effective/
- Perbedaan pseudonimisasi dan anonimisasi: https://www.edpb.europa.eu/topics/ai-and-technology/anonymisation-pseudonymisation_en
