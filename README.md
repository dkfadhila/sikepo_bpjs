# SIKEPO

Landing page, login, dan workspace investigasi klaim dengan tema hijau SIKEPO.

## Menjalankan lokal

Node.js 22.22 atau lebih baru. Jalankan `npm ci`, salin `.env.example` menjadi `.env`, isi `MONGODB_URI`, lalu `npm start`. Buka `http://localhost:7731`. Gunakan origin yang sama dengan `APP_ORIGIN` dalam `.env`.

## Deployment

`render.yaml` mendefinisikan satu Node web service yang melayani landing, login, dashboard, dan API. Domain `sikepo.tech` diarahkan Cloudflare ke `sikepo.onrender.com` dengan proxy aktif dan TLS Full (strict). Render otomatis menambahkan alias `www`, tanpa memerlukan penambahan domain dashboard di Render.

`dashboard.sikepo.tech` memakai custom domain Worker `sikepo-dashboard`. Source proxy ada di `cloudflare/dashboard-proxy.js`. Proxy hanya meneruskan ke origin tetap `https://sikepo.onrender.com`, mempertahankan cookie sesi, dan selalu mengirim `Cache-Control: no-store`. Autentikasi dashboard tetap diperiksa oleh backend Render. Log dan trace Worker memakai sampling 10%, dengan query string disamarkan.

Isi variabel server `MONGODB_URI`, `GOOGLE_GENERATIVE_AI_API_KEY`, dan `SENTRY_DSN` di Render. Database SIKEPO memakai nama `sikepo`, terpisah dari ScopeNote. Izinkan hanya rentang egress Render yang diperlukan di Atlas. Jangan membuka Atlas ke seluruh internet. Jangan commit `.env` atau credential Cloudflare/R2.

## Akun evaluasi submission

| Peran | Email |
| --- | --- |
| Super admin | admin@demo.sikepo.tech |
| Verifikator | verifikator@demo.sikepo.tech |
| Satgas anti fraud | satgas@demo.sikepo.tech |
| Auditor | auditor@demo.sikepo.tech |

Semua memakai kata sandi publik `SikepoDemo!2026` untuk reviewer submission. Kata sandi disimpan dengan scrypt dan salt acak. Tidak tersedia pendaftaran akun. Sesi opaque disimpan dalam MongoDB, kedaluwarsa setelah 8 jam, cookie HttpOnly/Secure, validasi origin dan token CSRF untuk logout/AI. Auditor hanya membaca hasil pemeriksaan; peran lain dapat meminta penjelasan AI. Tidak ada endpoint yang membuat keputusan pembayaran atau mengubah berkas pasien.

## Status mesin AI

Dashboard membaca 10.000 klaim sintetis dari MongoDB dengan pagination dan filter server. Dataset/model diarsipkan dalam GridFS privat. Isolation Forest dilatih di Hugging Face pada korpus historis 5 juta baris 2019-2025 (train 3.105.497, kalibrasi 912.883, test 981.620). Korpus penuh privat; 10.000 klaim Desember 2025 merupakan irisan aktif dashboard. Gemma menjelaskan rekomendasi. Verifikator menyimpan keputusan dengan riwayat dan kontrol versi. Evaluasi model hanya pada data sintetis; lihat [metodologi](docs/DATA-SUBMISSION.md).

Sentry mencatat error server dan sebagian trace jika DSN terpasang. Request body, cookie, query, dan headers dihapus dari error yang dikirim. Jangan gunakan data pasien asli pada workspace ini.

`npm test` memeriksa autentikasi, origin, isolasi dashboard, peran auditor, rotasi sesi, CSRF, dan logout.

## Dataset dan pelatihan

`npm run data:generate` → `npm run ml:train` → `npm run data:import`. Training memerlukan Python dan `pip install -r ml/requirements.txt`; runtime Render tetap Node. Jangan melatih di startup. Dataset dan model memiliki versi/checksum; ulang impor tidak menghapus review.
