# Eksperimen LLM tambahan SiKePO

Eksperimen memakai contoh instruksi sintetis dan akun Hugging Face milik pemilik proyek. Tidak menggunakan data peserta atau resume medis. Model tambahan bertugas menjelaskan sinyal dan bukti, bukan membuat keputusan klaim.

- Percobaan pertama: Qwen2.5 0.5B Instruct dengan LoRA, T4, maksimum 45 menit (US$0,30). Uji format internal 20/20 valid. Uji terpisah 10/14 lulus: sebagian keluaran melewatkan bukti atau tanda ML pada kasus campuran. Tidak dipasang.
- Percobaan kedua: model 0.5B, contoh dengan 0–6 sinyal, maksimum 45 menit T4 (US$0,30). Uji terpisah 14/14 kombinasi sinyal sintetis lulus. Belum dipasang; pengujian lanjutan dan layanan inferensi masih diperlukan.
- Percobaan ketiga: Qwen3 4B Instruct 2507 (Apache 2.0), LoRA, contoh 0–6 sinyal dan skor skenario yang konsisten. Permintaan GPU L4 dibatalkan saat masih mengantre dan diganti GPU A100, maksimum 90 menit (US$3,75). Evaluasi terpisah diperlukan.
- Dua uji terpisah: masing-masing T4 maksimum 20 menit (US$0,134). Batas gabungan training pertama, training kedua, dua uji T4, dan training A100 adalah US$4,618 sebelum biaya lain; biaya aktual ditentukan penagihan HF. Tidak ada endpoint persisten yang dibuat.

Script, job ID, batas waktu, dan revisi sumber disimpan di `ml/` dan `scripts/`; model dan keluaran tetap pada repositori HF privat. Evaluasi harus memeriksa keluaran terstruktur, kesesuaian sinyal dan bukti, tidak mengarang keputusan, dan validasi pada kasus yang tidak digunakan untuk training. Lulus pemeriksaan sintetis tidak membuktikan kesesuaian pada klaim sebenarnya. Jangan mengaktifkan model yang gagal tes. Gemma tetap aktif sebagai layanan penjelasan saat ini.
