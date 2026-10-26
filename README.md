# SIKEPO

Landing page, login demo, dan workspace investigasi klaim dengan tema hijau SIKEPO.

## Menjalankan lokal

Node.js 22.22 atau lebih baru. Jalankan `npm ci`, salin `.env.example` menjadi `.env`, isi `MONGODB_URI`, lalu `npm start`. Buka `http://localhost:7731`. Gunakan origin yang sama dengan `APP_ORIGIN` dalam `.env`.

## Deployment

`render.yaml` mendefinisikan satu Node web service yang melayani landing, login, dashboard, dan API. Tambahkan domain `sikepo.tech` serta `dashboard.sikepo.tech` di Render dan arahkan DNS Cloudflare ke hostname service Render yang benar. Konfigurasi TLS harus selesai sebelum dipakai.

Isi variabel server `MONGODB_URI`, `GOOGLE_GENERATIVE_AI_API_KEY`, dan `SENTRY_DSN` di Render. Database SIKEPO memakai nama `sikepo`, terpisah dari ScopeNote. Izinkan hanya rentang egress Render yang diperlukan di Atlas. Jangan membuka Atlas ke seluruh internet. Jangan commit `.env` atau credential Cloudflare/R2.

## Akun demo

| Peran | Email |
| --- | --- |
| Super admin | admin@demo.sikepo.tech |
| Verifikator | verifikator@demo.sikepo.tech |
| Satgas anti fraud | satgas@demo.sikepo.tech |
| Auditor | auditor@demo.sikepo.tech |

Semua memakai kata sandi publik `SikepoDemo!2026` untuk lingkungan demonstrasi. Kata sandi disimpan dengan scrypt dan salt acak. Tidak tersedia pendaftaran akun. Sesi opaque disimpan dalam MongoDB, kedaluwarsa setelah 8 jam, cookie HttpOnly/Secure, validasi origin dan token CSRF untuk logout/AI. Auditor hanya membaca simulasi; peran lain dapat meminta penjelasan AI. Tidak ada endpoint yang membuat keputusan pembayaran atau mengubah berkas pasien.

## Status mesin AI

Dashboard menampilkan 64 klaim sintetis. Angka risiko dan status adalah ilustrasi, bukan model ML terlatih atau bukti fraud. Mastra menjalankan workflow dua langkah: meminta penjelasan Gemma dan memvalidasi JSON keluarannya. Akses AI memerlukan konfigurasi server dan dibatasi anggaran global harian (`AI_DAILY_LIMIT`, default 20). Tidak ada keluaran contoh yang menggantikan kegagalan Gemma.

Sentry mencatat error server dan sebagian trace jika DSN terpasang. Request body, cookie, query, dan headers dihapus dari error yang dikirim. Jangan gunakan data pasien asli pada demo ini.

`npm test` memeriksa autentikasi, origin, isolasi dashboard, peran auditor, rotasi sesi, CSRF, dan logout.
