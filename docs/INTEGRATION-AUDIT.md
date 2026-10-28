# Audit integrasi model historis v3

Tanggal pemeriksaan: 28 Oktober 2026.

- Seluruh 5.000.000 baris dan checksum tujuh arsip diverifikasi, tanggal 2019-2025; schema tanpa identitas peserta.
- Train 3.105.497, kalibrasi 912.883, test 981.620. Seluruh test dihitung ulang dari pohon ekspor, cocok TN 651774 / FP 37322 / FN 22541 / TP 269983.
- Paritas Node dan scikit-learn: 200 fixture, toleransi 1e-12. Enam pemeriksaan kasus mencakup normal, biaya/durasi, duplikasi, ketidaksesuaian layanan/tagihan, bukti obat dan borderline. Borderline observasional, bukan assertion benar/salah.
- 13 tes otomatis lulus: autentikasi, CSRF, hak peran, input AI dari database, kontrol versi review, query, provenance, inferensi dan data sintetis.
- Impor MongoDB: sikepo-operational-3.0, 10000 klaim aktif, satu model versi baru, sembilan artefak GridFS.
- Uji browser lokal: login Verifikator, grafik Desember 2025, detail SYN-2512-00078 dengan lima indikator, skor anomali 0.6767 di atas ambang 0.3959, status HOLD. Catatan HOLD tersimpan. Gemma melalui Mastra menjelaskan indikator dan meminta bukti; tidak mengubah keputusan atau melakukan pembayaran.

Pembaruan: seluruh 5 juta klaim historis telah masuk ke MongoDB dan dapat ditelusuri melalui arsip. Ringkasan per tahun dan seluruh periode memakai agregat harian; antrean tetap irisan aktif 10.000. Review terhubung melalui identitas sumber bersama. Full corpus juga tersimpan privat di Hugging Face. Tidak ada klaim validasi pada data operasional BPJS, tidak ada training LLM baru.
