-- =============================================================================
-- 014_storage_buckets.sql
-- Migrasi: Konfigurasi Supabase Storage Bucket & Storage RLS Policies
-- Platform RAMPUNG — Pelaporan Aduan Warga Kota Surakarta
-- =============================================================================
-- File ini idempoten: aman dijalankan berulang kali.
-- Mengonfigurasi bucket 'laporan-foto' untuk foto kondisi sebelum dan sesudah.
-- =============================================================================

-- 1. Buat bucket 'laporan-foto' jika belum ada
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'laporan-foto',
  'laporan-foto',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Hapus kebijakan lama jika ada (idempoten)
DROP POLICY IF EXISTS "Publik dapat melihat foto laporan" ON storage.objects;
DROP POLICY IF EXISTS "Warga dapat mengunggah foto sebelum" ON storage.objects;
DROP POLICY IF EXISTS "Petugas dapat mengunggah foto sesudah" ON storage.objects;
DROP POLICY IF EXISTS "Hanya admin dapat menghapus foto" ON storage.objects;

-- 3. Kebijakan Hak Akses Storage (RLS pada storage.objects)

CREATE POLICY "Publik dapat melihat foto laporan"
ON storage.objects FOR SELECT
USING (bucket_id = 'laporan-foto');

CREATE POLICY "Warga dapat mengunggah foto sebelum"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'laporan-foto'
  AND (storage.foldername(name))[1] = 'sebelum'
);

CREATE POLICY "Petugas dapat mengunggah foto sesudah"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'laporan-foto'
  AND (storage.foldername(name))[1] = 'sesudah'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('petugas', 'admin')
  )
);

CREATE POLICY "Hanya admin dapat menghapus foto"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'laporan-foto'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
