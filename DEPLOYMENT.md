# Deployment SIKEPO

Source: https://github.com/dkfadhila/sikepo_bpjs

## Infrastruktur aktif

- Landing: https://sikepo.tech
- Login: https://sikepo.tech/login
- Dashboard: https://dashboard.sikepo.tech/dashboard/
- Render service: `sikepo`, ID `srv-dbfjha0n74is73elgjq0`, region Singapore, paket Free.
- Origin Render: https://sikepo.onrender.com
- Cloudflare Worker: `sikepo-dashboard`, custom domain `dashboard.sikepo.tech`.
- DNS apex memakai proxy Cloudflare ke Render. TLS Full (strict).
- Database MongoDB `sikepo` terpisah dari ScopeNote. Tidak ada perubahan allowlist Atlas atau data ScopeNote.
- Gemma `gemma-4-26b-a4b-it` melalui workflow Mastra dua langkah.
- Sentry memakai integrasi yang diizinkan dari ScopeNote; tag server `service=sikepo` membedakan event.

## Verifikasi

- Build Render dan startup MongoDB berhasil. Health endpoint publik mengonfirmasi database, Gemma, dan monitoring terkonfigurasi.
- Uji Gemma sungguhan menghasilkan JSON penjelasan tervalidasi melalui workflow Mastra.
- Endpoint ingest Sentry menerima event uji sintetis dengan HTTP 200.
- Checks menguji login, origin, proteksi dashboard termasuk URL terenkode, role auditor, rotasi sesi, CSRF, logout, dan proxy Cloudflare tanpa cache privat.
- GitHub Actions `Verify SIKEPO` menjalankan pemeriksaan pada branch main.

## Pengoperasian

Render Free dapat tidur saat tidak aktif; permintaan pertama dapat menunggu sekitar 50 detik atau lebih. Belum ada upgrade paket berbayar. Google API mengikuti kuota/billing akun pemilik. Demo membatasi total panggilan AI harian menjadi 20, tersimpan atomik dalam MongoDB.

Konfigurasi server disimpan di environment Render, bukan Git. File `.env` lokal diabaikan Git. Semua klaim dashboard sintetis. Skor risiko adalah ilustrasi; belum ada model ML terlatih atau keputusan pembayaran otomatis.

Perubahan source diunggah ke branch main. Jika Render tidak memicu build otomatis untuk repository publik, gunakan Manual Deploy > Deploy latest commit. Untuk Worker, unggah source `cloudflare/dashboard-proxy.js` dan pertahankan custom domain serta pengaturan observability yang ada.

Jalankan lokal dengan `npm start` pada port 7731. Preview statis lama port 7730 hanya untuk desain dan tidak menyediakan autentikasi backend.
