# Pengajuan terstruktur dan NALAR otomatis

Pengajuan baru tersedia di `/dashboard/#intake`, melalui komponen React dengan primitive shadcn yang sudah digunakan dashboard. `POST /api/claims` memerlukan login SA/VK, Origin yang diizinkan, CSRF, serta skema JSON ketat. Rate limit 30 pengajuan/jam per IP. Akun evaluator tetap dipertahankan sesuai permintaan pengguna.

Data baru hanya menerima deklarasi SYNTHETIC, periode 2019–2025, kode fasilitas/episode buatan, diagnosis dan pengukuran numerik. Kolom tambahan termasuk nama atau NIK ditolak. Deklarasi sintetis tidak menjamin bahwa pengguna tidak menyisipkan identitas pada kolom kode; pengguna tetap dilarang memasukkan data peserta nyata.

Saat diterima, aturan dan model Isolation Forest aktif langsung diperiksa. Pengajuan disimpan di koleksi `claims` dengan versi dataset saat ini, `intake` provenance, `reviewVersion:0`, dan `pipeline` persisten. `requestId` UUID dan digest menjadikan pengiriman ulang idempoten; penggunaan ID yang sama dengan isi berbeda menghasilkan 409. Jumlah duplikasi per episode masih merupakan input sumber, belum rekonsiliasi otomatis lintas sumber.

Worker memproses satu NALAR pada satu waktu, dengan pengambilan pekerjaan atomik, lease 180 detik, pemulihan lease kedaluwarsa, dan maksimum tiga percobaan. Kuota `ai_budget` harian dibagi dengan penjelasan manual. Kuota habis menunda pekerjaan sampai tengah malam UTC; gangguan upstream ditunda dan dicoba kembali. Restart tidak membuang pekerjaan. Artefak lima juta klaim historis tidak diproses massal oleh NALAR.

NALAR hanya menerima `signals`, `mlAnomaly` dan `score`, mengikuti kontrak model HF saat ini. Tidak ada ekstraksi PDF, pengiriman rekam medis, atau pembacaan berkas asli oleh NALAR. Ringkasan dihasilkan model dan divalidasi; pengukuran, daftar bukti, tindak lanjut dan rekomendasi jalur disusun server dari indikator klaim. UI membedakan bagian-bagian tersebut. Hasil otomatis tidak menulis persetujuan atau penolakan; endpoint review SA/VK dengan alasan dan optimistic version tetap menjadi satu-satunya jalur keputusan.

Sumber live belum terhubung ke BPJS, SIMRS atau e-Klaim. Panduan publik `/intake-guide.html` menjelaskan skema input dan kebutuhan integrasi lanjutan: izin pemilik data, pemetaan, autentikasi antarsistem, scoping fasilitas, acuan resmi berversi, dan kontrol privasi. Session evaluator bukan kredensial integrasi produksi. Anonimisasi/masking tidak diklaim otomatis memenuhi hukum.

Pengajuan baru merupakan tambahan ke antrean aktif, terpisah dari arsip historis sumber. `daysAgo:0` merujuk waktu masuk ke antrean, sementara `date` merupakan tanggal pelayanan skenario. Ringkasan arsip tetap berdasarkan korpus historis. Seed dan hash artefak pelatihan tidak diubah oleh pengajuan.

Verifikasi: unit/integrasi di `tests/intake.test.js` mencakup skema privasi, RBAC/CSRF, idempotensi, rute review, pengukuran terverifikasi, kuota habis, dan kegagalan NALAR berulang. Pengujian browser memakai satu klaim sintetis tanpa menyimpan persetujuan/penolakan. Paket model dan pelatihan tidak diubah.
