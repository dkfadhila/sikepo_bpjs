# Training historis sintetis di Hugging Face

Run yang diminta: **5.000.000 baris**, tanggal **2019-01-01 sampai 2025-12-31**. Tidak ada tanggal layanan 2026. Dataset terpisah dari koleksi aktif 10.000 klaim yang sebelumnya sudah dipasang. Model baru tidak otomatis menggantikan model aplikasi sebelum hasil evaluasinya diperiksa.

Job dibuat di namespace HF pengguna, dengan dataset, model dan source privat. Detail run yang tidak mengandung credential disimpan pada `ml/hf-job.json`. Token dibaca dari environment privat; tidak ada credential MongoDB, Google atau data akun yang diteruskan ke job. Job hanya memperoleh token Hugging Face yang diperlukan untuk membaca source dan menyimpan artefak.

## Data dan pelindungan privasi

`ml/hf_train_historical.py` membuat data sepenuhnya dari parameter dan RNG berseed `2802025`. Tidak mengunduh, mengolah, menyamarkan atau meniru baris data peserta JKN. Seluruh ID dan fasilitas fiktif; tidak ada NIK, nomor peserta, nama pasien, alamat, tanggal lahir atau rekam medis asli. Karena tidak ada bahan data asli, metode ini disebut **pembuatan data sintetis**, bukan anonimisasi/masking data BPJS. Ini tidak merupakan sertifikasi kepatuhan UU No.27 Tahun 2022; pengelolaan akun dan token tetap merupakan tanggung jawab pelindungan data.

Variasi mencakup 1.500 fasilitas fiktif, 38 kode wilayah sintetis, empat kelas fasilitas, 24 diagnosis contoh, variasi biaya/durasi yang saling tumpang tindih, efek fasilitas, tren tahunan dan musim buatan, serta delapan skenario: baseline, biaya/lama rawat, bukti obat, selisih layanan, selisih tagihan, duplikasi, campuran, dan borderline. Bobot tren hanya asumsi pengujian yang terinspirasi arah agregat publik, bukan rekonstruksi distribusi BPJS. Tarif, durasi normal dan label bukan ketentuan resmi atau bukti fraud.

Data disimpan per tahun dalam JSONL gzip. Manifest mencatat jumlah aktual, rentang tanggal, seed, cakupan fasilitas/diagnosis, komposisi skenario dan SHA-256 setiap arsip. Hasil harus diverifikasi terhadap manifest setelah job selesai; jumlah permintaan bukan bukti job berhasil menghasilkan semua baris.

## Pelatihan dan evaluasi

- Isolation Forest: 200 pohon, maksimal 512 sampel per pohon, CPU 8 vCPU.
- Tujuh fitur numerik, tanpa ID, tanggal, label skenario atau identitas sebagai fitur model.
- Train 2019–2023, kalibrasi 2024, development test 2025. Pasangan duplikat mewarisi tanggal yang sama agar tidak melintasi split waktu.
- Ambang: persentil ke-95 skor baris tanpa injeksi pada validasi. Label injeksi menggambarkan skenario eksperimen, bukan hasil adjudikasi.
- Output: pohon JSON untuk runtime Node, laporan metrik, fixture paritas scikit-learn/Node, dataset card dan model card.
- Tidak ada fine-tuning Gemma, model LLM baru, keputusan approval/rejection otomatis atau validasi operasional BPJS dalam job ini.

## Biaya dan operasi

Hardware HF Jobs yang dikutip saat launch: `cpu-upgrade` US$0,03/jam. Timeout keras satu jam, satu percobaan: plafon komputasi run **US$0,03**, di luar ketentuan kuota penyimpanan akun. Tidak ada GPU, endpoint persisten atau jadwal berulang. GPU tidak mempercepat implementasi scikit-learn ini.

Script launch menolak berjalan bila sudah ada `ml/hf-job.json`, untuk mencegah job ganda tanpa sengaja. Jika run gagal, periksa status/log terlebih dahulu; jangan mengulang seluruh job secara otomatis. Model baru harus diperiksa sebelum dipromosikan ke aplikasi.

## Hasil audit dan promosi v3

Job selesai. Seluruh 5.000.000 baris dan checksum tujuh arsip diverifikasi. Perhitungan independen 981.620 test cocok: TN 651774, FP 37322, FN 22541, TP 269983. Paritas Node/Python dan uji kasus lulus. Model `iforest-historical-3.0` dipromosikan bersama irisan 10.000 klaim Desember 2025. Korpus penuh kini tersedia publik di Hugging Face; MongoDB menyimpan arsip historis dan irisan aktif. NALAR dilatih terpisah menggunakan instruksi sintetis; tidak ada keputusan pembayaran otomatis.

Dataset revision `bcfb28d78aef80bb673c05b4dae0c66dcdf4eec9`; model revision `6d99f05e6230552f4f6c6d216c10f3a46e24bbbc`.
