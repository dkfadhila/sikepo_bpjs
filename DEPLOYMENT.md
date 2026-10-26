# Deployment SIKEPO

Source: https://github.com/dkfadhila/sikepo_bpjs

## Siap

- Landing dan dashboard yang telah disesuaikan, seluruh asset lokal dipertahankan.
- Panel `/login` dengan pilihan empat akun demo.
- Backend Node/Express, session MongoDB, kontrol akses API dan dashboard.
- Database `sikepo` terpisah dari `scopenote`; koneksi dan login/logout empat peran sudah diperiksa lokal.
- Workflow Mastra untuk penjelasan Gemma, validasi output, dan batas panggilan harian.
- Integrasi Sentry server dengan penyaringan data request.
- Blueprint Render, health check, serta pemeriksaan autentikasi otomatis.

## Belum live

Pembuatan service Render menunggu login akun pemilik di BrowserOS. Google API key dan Sentry DSN ScopeNote berada dalam environment Render, bukan `.env` lokal. Keduanya belum disalin dan belum diverifikasi pada SIKEPO.

Setelah login, buat service dari blueprint `render.yaml`, isi environment yang belum tersedia, dan pastikan database tetap `sikepo`. Gunakan hostname Render yang benar untuk CNAME Cloudflare `sikepo.tech` dan `dashboard.sikepo.tech`. Pertahankan MX/TXT email yang sudah ada. Verifikasi custom domain dan TLS di Render sebelum mengaktifkan trafik publik.

Periksa langsung: landing HTTPS, login, redirect ke dashboard, empat peran demo, logout, akses dashboard tanpa sesi, Gemma dengan klaim sintetis, serta penerimaan error uji Sentry yang tidak memuat data pasien. Belum ada klaim bahwa model ML telah dilatih.

Jalankan lokal dengan `npm start` pada port 7731. Server preview statis lama port 7730 hanya untuk desain; tidak menyediakan autentikasi backend.
