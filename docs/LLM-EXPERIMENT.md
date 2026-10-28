# Eksperimen LLM tambahan SiKePO

Eksperimen memakai contoh instruksi sintetis dan akun Hugging Face milik pemilik proyek. Tidak menggunakan data peserta atau resume medis. Model tambahan bertugas menjelaskan sinyal dan bukti, bukan membuat keputusan klaim.

- Percobaan pertama: Qwen2.5 0.5B Instruct dengan LoRA, T4, maksimum 45 menit (US$0,30). Uji format internal 20/20 valid. Uji terpisah 10/14 lulus: sebagian keluaran melewatkan bukti atau tanda ML pada kasus campuran. Tidak dipasang.
- Percobaan kedua: model 0.5B, contoh dengan 0–6 sinyal, maksimum 45 menit T4 (US$0,30). Uji terpisah 14/14 kombinasi sinyal sintetis lulus. Belum dipasang; pengujian lanjutan dan layanan inferensi masih diperlukan.
- Percobaan ketiga: Qwen3 4B Instruct 2507 (Apache 2.0), LoRA, contoh 0–6 sinyal dan skor skenario yang konsisten. Permintaan GPU L4 dibatalkan saat masih mengantre dan diganti GPU A100, maksimum 90 menit (US$3,75). Evaluasi terpisah diperlukan.
- Dua uji terpisah: masing-masing T4 maksimum 20 menit (US$0,134). Batas gabungan training pertama, training kedua, dua uji T4, training A100, watcher CPU dan satu uji T4 tambahan adalah sekitar US$4,835 sebelum biaya lain; biaya aktual ditentukan penagihan HF. Tidak ada endpoint persisten yang dibuat.

Script, job ID, batas waktu, dan revisi sumber disimpan di `ml/` dan `scripts/`; model dan keluaran tetap pada repositori HF privat. Evaluasi harus memeriksa keluaran terstruktur, kesesuaian sinyal dan bukti, tidak mengarang keputusan, dan validasi pada kasus yang tidak digunakan untuk training. Lulus pemeriksaan sintetis tidak membuktikan kesesuaian pada klaim sebenarnya. Jangan mengaktifkan model yang gagal tes. NALAR digunakan sebagai layanan penjelasan.

Watcher satu kali memantau job A100, lalu menjalankan uji independen T4 maksimal 30 menit apabila pemeriksaan format training berhasil. Watcher tidak memasang model. Jika training atau evaluasi gagal, hasil tetap privat untuk diperiksa. Akun Hugging Face tercatat bukan PRO; endpoint inferensi persisten belum dibuat.

## NALAR 4B — layanan inferensi

Training 8.000 pasangan instruksi-respons selesai. Revisi adapter yang diuji: `f93d42c68503f6b9f8d18dd2d018cb5bff91edd8`. Pemeriksaan terpisah pada 14 kombinasi sinyal sintetis lulus. Hasil ini terbatas pada format, cakupan bukti, dan larangan keputusan pembayaran; bukan validasi klinis.

Layanan privat `konigiri/sikepo-nalar` memakai ZeroGPU tanpa komputasi berbayar persisten. Layanan HF RUNNING pada ZeroGPU. Tiga uji inferensi langsung (tanpa sinyal, dua sinyal, enam sinyal) berhasil dan lolos validasi bukti, dengan waktu respons sekitar 7–10 detik pada pengujian 28 Oktober 2026. Server mengirim hanya signals, mlAnomaly, dan score; tidak mengirim ID klaim atau dokumen. Keluaran harus sesuai revisi, skema, dan daftar bukti. `NALAR_ENABLED=true` serta `HF_TOKEN` mengaktifkan jalur NALAR setelah uji layanan berhasil. Ketika kuota habis, layanan gagal, atau validasi gagal, layanan menampilkan pesan untuk mencoba kembali; tidak ada model cadangan. Batas harian AI tetap berlaku. Jangan mengaktifkan flag sebelum uji inferensi layanan lolos.
