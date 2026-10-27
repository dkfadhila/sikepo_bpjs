# SiKePO — kebutuhan data dan metodologi dataset submission

Versi dataset: `sikepo-synthetic-1.0`. Sumber: **sepenuhnya sintetis**. Dataset ini bukan data BPJS yang dimasking atau dianonimkan, bukan data peserta JKN, dan bukan hasil pelatihan terhadap rekam medis. Aplikasi dapat diakses dan menjalankan autentikasi, pemuatan data API, penghitungan indikator, pencarian, filter, ekspor, serta penjelasan Gemma apabila layanan tersedia. Ketersediaan aplikasi berbeda dari validasi untuk penggunaan operasional BPJS.

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

## 2. Cara memperoleh data tanpa meminta data peserta

1. Tim menulis rentang nilai dan enam skenario berdasarkan kebutuhan pengujian alur aplikasi, bukan dari observasi pasien atau salinan dokumen BPJS.
2. Generator Node.js `scripts/generate-synthetic.mjs` memakai LCG 32-bit dengan seed tetap `2702026`: `state = (1664525 × state + 1013904223) mod 2^32`. Tidak ada unduhan dataset, API BPJS, atau input peserta.
3. Dibuat 240 pengajuan: masing-masing 40 skenario baseline, rasio biaya dan lama rawat, bukti obat, ketidaksesuaian layanan, selisih tagihan, dan duplikasi. Distribusi ini sengaja seimbang untuk cakupan pengujian, **bukan estimasi prevalensi fraud**.
4. Delapan diagnosis contoh dipilih dari daftar kode yang ditulis di generator. Tarif Rp2,95–9,8 juta dan acuan rawat 3–7 hari adalah parameter buatan, **bukan tarif resmi INA-CBG atau standar klinis**.
5. Seluruh ID memakai awalan `SYN-`; enam fasilitas bernama `Fasilitas Sintetis 01–06`. Tidak ada pengenal peserta. Episode duplikat dibuat dengan menghubungkan dua pengajuan sintetis pada fasilitas yang sama.
6. Tanggal diambil dari periode tetap 27 September–26 Oktober 2026. Filter 7/30 hari relatif terhadap tanggal acuan dataset, bukan tanggal akses aplikasi. Dengan demikian data tidak menghilang ketika tanggal submission bergeser.
7. Hasil disimpan sebagai JSON dan CSV; manifest berisi seed, versi, jumlah, daftar field dan SHA-256 JSON. Label penyisipan terpisah. Regenerasi: `npm run data:generate`. Pemeriksaan: `npm test`.

Artefak: `data/synthetic/claims.json`, `claims.csv`, `manifest.json`, `scenario-labels.json`. File mentah tersebut disimpan di repositori, tidak dalam direktori aset publik. Dashboard mengakses data melalui `/api/claims` setelah autentikasi.

## 3. Penghitungan yang benar-benar dijalankan

Server menghitung enam indikator pada setiap pengajuan:

| Kondisi | Bobot |
| --- | ---: |
| Pengajuan > 1,3 × tarif acuan skenario | 30 |
| Lama rawat > acuan + 2 hari | 20 |
| Obat restriksi tanpa bukti | 25 |
| Jumlah layanan ditagih ≠ didokumentasikan | 35 |
| Total rincian tagihan ≠ pengajuan | 25 |
| Lebih dari satu pengajuan pada episode | 45 |

Skor = jumlah bobot, dibatasi 99. Skor ini indeks prioritas **bukan probabilitas fraud**. Risiko rendah <35, sedang 35–69, tinggi ≥70; batas ini heuristik aplikasi, bukan ketentuan BPJS. Sinyal menghasilkan status `HOLD` (perlu review); lainnya `PENDING` (menunggu review). Tidak ada penolakan atau persetujuan otomatis. Panel tidak menyimpan keputusan adjudikasi pengguna.

Penjelasan AI menggunakan workflow Mastra → Google Gemma → validasi JSON. Browser hanya mengirim ID klaim. Server memilih data sintetis yang sudah diketahui dan mengirim hanya ID sintetis, nilai pengajuan, tarif skenario, durasi, acuan durasi, skor, dan kode indikator. Input bebas, dokumen medis, nama, email akun, dan identitas peserta tidak dikirim ke Gemma melalui endpoint ini. AI tidak menjadi bukti fraud. Kegagalan model ditampilkan sebagai kegagalan, tanpa jawaban palsu pengganti.

Model ML/IsolationForest khusus **belum dilatih atau tervalidasi**; tidak ada klaim akurasi, sensitivitas, spesifisitas, atau keberhasilan mendeteksi fraud operasional. Pengujian aturan pada skenario yang dibuat dengan kondisi serupa hanya memeriksa implementasi, bukan membuktikan generalisasi klinis.

## 4. Pelindungan data dan batas penggunaan

UU No. 27 Tahun 2022 Pasal 4 menempatkan data dan informasi kesehatan sebagai data pribadi spesifik. Submission memilih pembuatan data baru dari nol sehingga tidak memproses rekam kesehatan peserta. Ini mengurangi kebutuhan dan risiko pemrosesan data peserta; **bukan pernyataan sertifikasi atau jaminan kepatuhan menyeluruh**. Email akun dan sesi autentikasi tetap perlu dikelola sebagai data akun.

Tidak ada proses masking dalam pembuatan dataset ini karena tidak ada data asli sebagai bahan. Apabila data asli akan digunakan kelak, mengganti nama/NIK atau hashing ID saja merupakan pseudonimisasi dan belum membuktikan anonimitas. Tetapkan dasar pemrosesan dan tujuan bersama pengendali data, minimalkan kolom, pisahkan kunci penghubung, batasi akses/retensi, lakukan penilaian risiko identifikasi ulang atas kombinasi diagnosis langka, tanggal dan fasilitas, serta kaji dampak pelindungan data sesuai konteks sebelum mengubah jalur data. Jangan unggah data asli ke repositori atau layanan AI lewat jalur submission.

Sentry dikonfigurasi tanpa PII default; body, cookie, query, header, dan user dihapus dari event error. Dataset kesehatan asli tidak ditambahkan ke log. Akun evaluasi bersama digunakan untuk reviewer submission; akun tersebut bukan kontrol akses yang memadai untuk data kesehatan operasional.

## 5. Narasi singkat untuk submission

“SiKePO merupakan aplikasi web yang dapat diakses dengan autentikasi berbasis peran. Untuk evaluasi submission, SiKePO menggunakan 240 pengajuan sepenuhnya sintetis, dibuat secara deterministik dengan seed tetap dan enam skenario pemeriksaan. Tidak ada data peserta JKN, ekstraksi BPJS, atau rekam medis asli yang digunakan. Parameter biaya dan lama rawat merupakan nilai skenario, bukan tarif atau pedoman klinis resmi. Server menghitung indikator berbasis aturan dan menyajikan prioritas review; Mastra dan Gemma membantu menjelaskan indikator. Temuan tetap memerlukan verifikasi manusia dan tidak menghasilkan keputusan fraud atau pembayaran otomatis.”

## Rujukan

- UU No. 27 Tahun 2022: https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/crc32/
- Prinsip evaluasi identifiability (referensi teknis, bukan hukum Indonesia): https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/how-do-we-ensure-anonymisation-is-effective/
- Perbedaan pseudonimisasi dan anonimisasi: https://www.edpb.europa.eu/topics/ai-and-technology/anonymisation-pseudonymisation_en
