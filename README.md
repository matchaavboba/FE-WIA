# RAMPUNG (Ruang Aduan, Monitor Penanganan, Ungkap Nyata Guyub)

Karya Kompetisi Web In Action (WIA) - Multimedia In Action (MIA) 2026  
Tim: OTW jdi nasabah prioritas (Institut Teknologi Sepuluh Nopember)
- Revalina Erica Permatasari (Project Manager & UI/UX Designer)
- Syifa Nurul Alfiah (Frontend Engineer)
- Putri Joselina Silitonga (Backend Engineer)

---

## 1. Deskripsi Project

RAMPUNG adalah platform web pelaporan keluhan warga dan analisis data publik berbasis transparansi dua arah, yang mengintegrasikan verifikasi bukti foto sebelum-sesudah (*before-after*) dengan dasbor wawasan kewargaan (*civic insight*) untuk mendukung akuntabilitas layanan publik Kota Surakarta. Melalui integrasi pelaporan partisipatif dan pemetaan geospasial, platform ini memastikan setiap aduan tertangani secara nyata dan hasilnya dapat diverifikasi langsung oleh masyarakat.

Pelapor menjadi penentu akhir apakah suatu laporan benar-benar *rampung*. Platform ini ditujukan bagi warga Kota Surakarta (5 kecamatan, 54 kelurahan, 587.646 jiwa; Dispendukcapil Kota Surakarta, 2023), petugas instansi, dan publik yang ingin memantau kinerja layanan.

![Screenshot aktual halaman beranda RAMPUNG dari aplikasi web](docs/images/Desktop.png)

### Masalah yang Diselesaikan

| Masalah | Solusi di RAMPUNG |
| :--- | :--- |
| Laporan sulit dipantau | **Lacak Laporan**: garis waktu status dan hitungan hari dengan kode lacak |
| Klaim "selesai" sulit dicek | Foto sebelum-sesudah berdampingan; pelapor menjawab "Sudah beres" atau "Belum" |
| Data sulit dipahami | **Papan Tanggap**, **Ringkasan Bulanan**, dan "Dari Mana Data Ini?" untuk tiap angka |
| Layanan belum inklusif | Teks besar, kontras tinggi, fitur dibacakan, dan navigasi keyboard (target WCAG 2.2 AA) |

### Fitur dan Status Implementasi

- **Pelaporan dan pelacakan**: formulir laporan, validasi, kode lacak, serta halaman riwayat tersedia. Pengiriman ke database memerlukan konfigurasi Supabase.
- **Peta laporan**: peta Leaflet dengan marker dan filter wilayah/status/kategori; sumber data mengikuti konfigurasi live atau offline.
- **Dashboard dan Papan Tanggap**: ringkasan, tren, distribusi, kinerja, dan state loading/error/kosong.
- **Akun**: login, daftar, dan profil menggunakan Supabase Auth. Akun publik mendapat role `warga`; role admin/petugas diberikan oleh administrator.
- **Validasi backend**: validasi skema dan koordinat, transisi status, pembatasan permintaan, sanitasi konten, dan pemeriksaan magic bytes untuk gambar.
- **Masih perlu integrasi end-to-end**: pengujian autentikasi/role dan upload foto pada project Supabase milik tim, penyajian foto dari bucket privat, serta verifikasi deploy staging/production.

Data lokal yang tersedia untuk pengembangan bukan data live. Saat mock aktif, laporan baru disimpan di browser dan tidak masuk ke Supabase. Antarmuka tidak menampilkan badge mode; tim tetap harus memastikan sumber data sebelum demo atau deploy.

---

## 2. Alur Aplikasi

Aplikasi melibatkan tiga peran: **Warga/Pengguna**, **Sistem (validasi)**, dan **Petugas/Instansi**.
Alur berikut menjelaskan rancangan layanan; fitur yang belum terhubung penuh ke database atau storage ditandai pada bagian [Status Proyek dan Verifikasi](#5-status-proyek-dan-verifikasi).

1. **Warga membuat laporan.** Dari beranda, warga memilih *Lapor Sekarang*, mengisi judul, deskripsi, kategori, lokasi, foto sebelum, dan identitas (anonim atau bernama). Setelah terkirim, warga menerima **kode lacak**.
2. **Sistem memeriksa laporan awal.** Sistem mengecek kelengkapan dan relevansi. Jika kurang jelas, warga mendapat **saran perbaikan** (lokasi, kronologi, detail). Jika terdeteksi spam, promosi, pinjaman, atau iklan, laporan diberi status **"Memerlukan verifikasi tambahan"**. Laporan tidak dihapus otomatis.
3. **Petugas memverifikasi.** Petugas menerima laporan, meminta dilengkapi, atau menolak disertai alasan. Laporan yang ditandai sistem perlu ditinjau oleh petugas.
4. **Laporan disimpan dan dicek kemiripannya.** Data masuk ke database (Supabase PostgreSQL + PostGIS) dan foto ke Storage. Sistem mencari laporan serupa berdasarkan kategori dan radius lokasi.
5. **Instansi menangani.** Status berjalan: **Diteruskan → Dalam Penanganan → Selesai**, dan petugas mengunggah foto sesudah.
6. **Warga melacak laporan.** Warga melihat linimasa status di halaman *Lacak Laporan*. Pembaruan realtime memerlukan konfigurasi dan integrasi Supabase yang sesuai.
7. **Warga mengonfirmasi hasil.** Warga melihat foto sebelum dan sesudah berdampingan lalu menjawab "Sudah beres" atau "Belum".
8. **Warga dan publik memantau.** *Peta Laporan* menampilkan sebaran laporan dengan filter; *Dashboard* menampilkan tren, perbandingan, dan insight otomatis lengkap dengan sumber serta waktu pembaruan data.

### Catatan tentang Validasi Laporan

Lapisan validasi bekerja dengan aturan dan kata kunci (*rule-based*) serta klasifikasi ringan. Fungsinya hanya **memberi penanda dan saran**, bukan menolak laporan. Sistem tidak dapat memastikan benar atau tidaknya suatu kejadian di lapangan; keputusan akhir ada pada petugas, dan hasil perbaikan dikonfirmasi oleh pelapor.

### Diagram Alur dan Arsitektur Sistem

#### Flowchart Sistem
![Flowchart Sistem](docs/images/flowchart-sistem.png)

#### User Flow
![User Flow](docs/images/user-flow.png)

#### Arsitektur Sistem
![Arsitektur Sistem](docs/images/arsitektur-sistem.png)

---

## 3. Tech Stack yang Digunakan

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| Framework Utama | Next.js 14 (App Router) | Server-side rendering dan routing aplikasi terpadu |
| Bahasa Pemrograman | TypeScript | Keamanan tipe data statis (type safety) |
| Desain & Styling | Tailwind CSS | Utility-first CSS framework |
| Komponen Antarmuka | shadcn/ui (Radix UI) | Komponen aksesibel berstandar WCAG |
| Visualisasi 3D | Three.js / React Three Fiber | Elemen visual 3D interaktif pada beranda (client-side) |
| Peta Interaktif | Leaflet & React-Leaflet | Pemetaan titik sebaran laporan geospasial |
| Backend & Basis Data | Supabase (PostgreSQL) | Basis data relasional dan otentikasi (Row Level Security) |
| Ekstensi Geospasial | PostGIS | Kueri jarak radius untuk deteksi laporan serupa di sekitar lokasi |
| Penyimpanan Media | Supabase Storage | Penyimpanan foto kondisi sebelum dan sesudah (sanitasi metadata EXIF) |
| Pembaruan Real-Time | Supabase Realtime | Distribusi pembaruan status tiket penanganan secara langsung |
| Validasi Konten | Rule-Based Text Sanitizer | Deteksi dini spam, promosi, dan konten tidak relevan |
| Deployment & Hosting | Vercel | Platform hosting frontend teroptimasi |

---

## 4. Cara Menjalankan Project

### Prasyarat
- Node.js versi 18.17.0 atau lebih baru
- Package manager (npm, pnpm, atau yarn)
- Git

### Langkah Instalasi dan Menjalankan

1. **Clone Repository**
   ```bash
   git clone git@github.com:matchaavboba/FE-WIA.git
   cd FE-WIA
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi environment**
   - Supabase opsional untuk menjalankan UI dengan data offline. Untuk koneksi live, buat project Supabase dan dari **Project Settings → API** salin Project URL serta `anon`/publishable key.
   - Buat `.env.local` secara lokal (jangan commit file ini). Template `.env.example` tidak disertakan. Untuk UI offline, set `NEXT_PUBLIC_USE_MOCK=true`; untuk koneksi live, set flag ke `false` dan isi:
     ```env
     NEXT_PUBLIC_APP_URL=http://localhost:3000
     NEXT_PUBLIC_USE_MOCK=false
     NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-or-publishable-key>
     SUPABASE_SERVICE_ROLE_KEY=<service-role-secret>
     ```
   - `SUPABASE_SERVICE_ROLE_KEY` hanya untuk server. Jangan beri awalan `NEXT_PUBLIC_`, masukkan ke bundle browser, atau commit nilainya.

4. **Siapkan Supabase (opsional untuk UI offline)**
   - Cocokkan daftar file di `supabase/migrations/` dengan backend sebelum migrasi. Nomor `012` belum tersedia; migrasi `014_storage_buckets.sql` kini disinkronkan dari backend. Pastikan migrasi storage ini ditinjau sebelum diterapkan ke database production.
   - Jangan jalankan `016_seed_laporan_simulasi.sql` pada project production.
   - Setelah skema dikonfirmasi dan diterapkan, verifikasi kategori dengan `SELECT id, nama, slug FROM public.kategori;`.
   - Migrasi backend `014_storage_buckets.sql` membuat bucket `laporan-foto` publik dengan batas 5 MB dan kebijakan upload. Terapkan hanya setelah ditinjau; unggahan foto live perlu dites pada project staging.
   - Panduan yang ada: [supabase/README.md](./supabase/README.md).

5. **Jalankan aplikasi**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000`. Jika mengubah `.env.local`, hentikan lalu jalankan ulang server agar konfigurasi terbaca.

   - Untuk kerja FE tanpa Supabase, biarkan `NEXT_PUBLIC_USE_MOCK=true`. Halaman memakai berkas data lokal; laporan baru pada mode ini tersimpan di browser yang digunakan.
   - Untuk menguji koneksi database, isi URL, anon key, dan service role key Supabase milik project tim; set `NEXT_PUBLIC_USE_MOCK=false` lalu restart server. Service role key wajib server-only.
   - Pendaftaran dan login memakai Supabase Auth. Trigger migrasi `005_tabel_pengguna.sql` membuat profil dengan role `warga`; role `petugas` dan `admin` hanya dapat diberikan administrator, bukan dipilih lewat pendaftaran publik.
   - Tanpa konfigurasi Supabase, pendaftaran/login menampilkan error dan tidak membuat akun lokal palsu. Di mode live, form meminta signed upload URL, mengunggah foto ke bucket `laporan-foto`, lalu mengirim storage path ke API. Alur ini perlu diuji dengan kredensial dan kebijakan bucket project Supabase tim.

6. **Build Produksi**
   ```bash
   npm run build
   npm run start
   ```
   Untuk deployment, atur environment variable di secret manager hosting, set `NEXT_PUBLIC_APP_URL` ke domain HTTPS, `NEXT_PUBLIC_USE_MOCK=false`, serta konfigurasi Site URL dan allowed redirect URLs Supabase ke domain tersebut. Uji login, laporan, hak akses, peta, dan foto di staging sebelum rilis.

---

## 5. Status Proyek dan Verifikasi

Status ini membedakan fondasi yang tersedia dengan integrasi yang masih harus diuji pada environment tim:

| Modul / Komponen | Rincian Pekerjaan | Status Saat Ini |
| :--- | :--- | :--- |
| Aplikasi Next.js | Halaman beranda, laporan, peta, Papan Tanggap, autentikasi, profil, dan API tersedia. | Terimplementasi; build terverifikasi |
| Tes logika/backend | Tes state machine, validasi, koordinat, rate limit, sanitasi, dan upload dijalankan lokal. | Lulus lokal; bukan pengganti tes staging |
| Supabase Auth dan database live | Memerlukan kredensial, migrasi yang dikonfirmasi, serta akun uji milik tim. | Belum dapat diverifikasi di environment ini |
| Supabase Storage foto | Alur upload/baca foto belum selesai end-to-end. | Perlu dilengkapi |
| Deployment | Perlu environment production, redirect Supabase, dan uji staging. | Belum diverifikasi |

Perintah validasi yang tersedia:

```bash
npm run build
```

Tes backend yang didefinisikan di `__tests__/backend.test.ts` dan `__tests__/unit_security_logic.ts` dapat dijalankan dengan `ts-node` setelah dependencies terpasang. Script `npm test` di `package.json` menunjuk ke Jest, tetapi Jest belum tercantum sebagai dependency proyek.

---

## 6. Struktur Dokumentasi

```
FE-WIA/
├── README.md
├── supabase/
│   ├── README.md
│   ├── migrations/
│   └── tests/
└── docs/
    ├── API.md
    ├── DATA.md
    ├── FRONTEND_HANDOFF.md
    ├── SECURITY.md
    └── images/
        ├── Desktop.png
        ├── flowchart-sistem.png
        ├── user-flow.png
        └── arsitektur-sistem.png
```
