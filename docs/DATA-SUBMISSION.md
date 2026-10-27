# SiKePO — kebutuhan data dan metodologi dataset submission

Versi dataset: `sikepo-synthetic-2.0`. Sumber: **sepenuhnya sintetis**. Dataset ini bukan data BPJS yang dimasking atau dianonimkan, bukan data peserta JKN, dan bukan hasil pelatihan terhadap rekam medis. Aplikasi dapat diakses dan menjalankan autentikasi, pemuatan data API, penghitungan indikator, pencarian, filter, ekspor, serta penjelasan Gemma apabila layanan tersedia. Ketersediaan aplikasi berbeda dari validasi untuk penggunaan operasional BPJS.

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
| Evaluasi | Label skenario yang sengaja disisipkan | Memeriksa generator dan cakupan kasus | `scenario-labels.json`; tidak menjadi masukan aturan |

Untuk integrasi operasional selanjutnya diperlukan rincian item layanan (kode, kuantitas, harga satuan, waktu pelayanan), tindakan ICD-9-CM, kelompok INA-CBG dan severity, kelas perawatan, tarif resmi beserta versi/tanggal berlakunya, bukti pelayanan terstruktur, ketentuan restriksi obat yang berlaku, dan hasil review berotorisasi. Resume medis/free text, tanggal lahir, alamat, dan identitas peserta **tidak dikumpulkan** oleh submission ini. Untuk model ML yang tervalidasi diperlukan data pembanding yang diperoleh secara sah, definisi label yang disepakati, serta hasil adjudikasi manusia; label skenario sintetis bukan pengganti ground truth fraud.

## 2. Pembuatan dan penyimpanan dataset

Generator `scripts/generate-synthetic.mjs` menghasilkan 10.000 pengajuan sepenuhnya sintetis. Seed LCG 32-bit tetap `2702026`; tidak ada data peserta, API BPJS, atau distribusi rekam medis yang dipelajari. Komposisi sengaja dibuat untuk eksperimen: 7.000 baseline dan masing-masing 600 skenario biaya/lama rawat, bukti obat, ketidaksesuaian layanan, selisih tagihan, dan duplikasi. Komposisi ini bukan estimasi prevalensi fraud.

Seluruh ID memakai awalan `SYN-`. Enam fasilitas fiktif dan delapan diagnosis contoh dipakai sebagai konteks. Tarif Rp2,95–9,8 juta serta acuan rawat 3–7 hari adalah nilai buatan, bukan tarif resmi atau standar klinis BPJS. Periode tetap 27 September–26 Oktober 2026; filter 7/30 hari relatif pada tanggal acuan dataset.

Data aktif benar-benar diimpor ke koleksi `claims` di MongoDB. Metadata berada di `datasets`, laporan model di `models`. Snapshot JSON/CSV, manifest, label skenario, model, laporan evaluasi dan pembagian episode disimpan sebagai tujuh arsip gzip di GridFS privat (`artifacts.files` dan `artifacts.chunks`), dengan checksum SHA-256. Artefak tidak diletakkan dalam direktori aset publik. Impor memakai upsert per versi dataset dan ID; mengulang impor tidak menggandakan klaim atau menghapus keputusan reviewer.

Dashboard membaca halaman klaim, pencarian, filter, urutan dan ringkasan melalui API MongoDB. Ekspor menggunakan cursor database. Data tidak diunduh 10.000 baris sekaligus ke browser. Tidak ada fallback diam-diam ke JSON apabila database gagal.

Perintah reproduksi: `npm run data:generate`, `npm run ml:train`, `npm run data:import`. Konfigurasi koneksi berada pada environment privat; jangan menaruh credential di repositori.

## 3. Pipeline aturan, machine learning dan rekomendasi

### A1 — aturan aplikasi

Server memeriksa rasio biaya >1,3 kali acuan (bobot 30), durasi >acuan+2 hari (20), obat restriksi tanpa bukti (25), jumlah layanan tidak cocok (35), total tagihan tidak cocok (25), dan pengajuan berulang pada episode yang sama (45). Jumlah bobot dibatasi 99. Ini heuristik aplikasi, bukan peraturan adjudikasi BPJS.

### A2 — model yang benar-benar dilatih

Isolation Forest scikit-learn memakai 120 pohon, maksimum 256 sampel per pohon, random seed `2702026`. Fitur: rasio biaya, rasio lama rawat, indikator bukti obat hilang, rasio selisih jumlah layanan, rasio selisih tagihan, jumlah pengajuan episode, dan log tarif. Nama, kode diagnosis, ID, label skenario, skor aturan, dan status keputusan tidak menjadi fitur model.

Pembagian berdasarkan hash ID episode memastikan episode yang sama tidak masuk set berbeda: train 6.972, validasi 1.524, test 1.504. Model fit secara unsupervised pada seluruh baris train. Ambang anomali memakai persentil ke-95 skor baseline di validasi, bukan test. Label penyisipan hanya untuk kalibrasi/evaluasi. Percobaan pengembangan sebelumnya menunjukkan fit pada baseline saja tidak mempelajari variasi indikator yang selalu nol; konfigurasi akhir menggunakan seluruh train. Hasil berikut merupakan evaluasi pengembangan sintetis, bukan benchmark klinis independen.

Hasil test sintetis: precision 87,5%, recall 100%, F1 93,33%, ROC-AUC 0,9999; TN 984, FP 65, FN 0, TP 455. Skenario buatan cukup mudah dibedakan, sehingga hasil ini tidak dapat digeneralisasi ke fraud nyata. Kesalahan positif tetap ada. Laporan rinci beserta versi library dan checksum tersedia pada `ml/artifacts/evaluation.json`.

Model diekspor sebagai pohon JSON. Inferensi Node di server diuji terhadap skor scikit-learn pada 104 contoh terpisah dari perhitungan Node dengan toleransi 1e-12. Tidak perlu memasang Python atau melatih ulang setiap Render restart. Untuk data baru, hitung ulang fitur lalu jalankan versi model yang tercatat; melatih ulang memerlukan versi dataset/model dan evaluasi baru.

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
