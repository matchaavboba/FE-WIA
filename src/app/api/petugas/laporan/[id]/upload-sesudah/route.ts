/**
 * src/app/api/petugas/laporan/[id]/upload-sesudah/route.ts
 * Endpoint Perolehan Signed URL Unggah Foto Sesudah Perbaikan (Petugas)
 * Platform RAMPUNG — Pelaporan Aduan Warga Kota Surakarta
 */

import { NextRequest } from 'next/server';
import { apiSukses, apiError } from '@/lib/server/response';
import { dapatkanKonteksAuth } from '@/lib/server/auth';
import {
  generateNamaFileAcak,
  deteksiMimeTypeDariBuffer,
  formatUrlFoto,
  dapatkanThumbnailUrl,
} from '@/lib/server/upload';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await dapatkanKonteksAuth(req.headers.get('authorization') || undefined);
    if (!auth.isAuthenticated || (auth.role !== 'petugas' && auth.role !== 'admin')) {
      return apiError('FORBIDDEN', 'Hanya petugas atau admin yang berhak mengunggah foto sesudah');
    }

    if (!isSupabaseConfigured()) {
      return apiError('SERVICE_UNAVAILABLE', 'Supabase Storage belum dikonfigurasi untuk unggah foto.');
    }

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file || typeof file === 'string') {
        return apiError('VALIDATION_ERROR', 'Berkas foto tidak ditemukan dalam form data.');
      }
      if (file.size > 5 * 1024 * 1024) {
        return apiError('VALIDATION_ERROR', 'Ukuran foto melebihi batas maksimal 5 MB.');
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const validasi = deteksiMimeTypeDariBuffer(buffer);
      if (!validasi.valid || !validasi.mimeType) {
        return apiError('VALIDATION_ERROR', validasi.error || 'Format berkas tidak diizinkan.');
      }

      const ekstensi =
        validasi.mimeType === 'image/png' ? 'png' : validasi.mimeType === 'image/webp' ? 'webp' : 'jpg';
      const pathFile = `sesudah/${generateNamaFileAcak(ekstensi)}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('laporan-foto')
        .upload(pathFile, buffer, { contentType: validasi.mimeType, upsert: false });

      if (uploadError) {
        console.error('[upload-sesudah] Storage upload error:', uploadError.message);
        return apiError('INTERNAL_ERROR', 'Gagal mengunggah foto ke Supabase Storage.');
      }

      return apiSukses({
        file_path: pathFile,
        public_url: formatUrlFoto(pathFile),
        thumbnail_url: dapatkanThumbnailUrl(pathFile),
      });
    }

    const json = await req.json();
    const tipe = typeof json.tipe === 'string' ? json.tipe.toLowerCase() : 'image/jpeg';

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(tipe)) {
      return apiError('VALIDATION_ERROR', 'Format file tidak didukung');
    }

    const ekstensi = tipe === 'image/png' ? 'png' : tipe === 'image/webp' ? 'webp' : 'jpg';
    const namaFile = generateNamaFileAcak(ekstensi);
    const pathFile = `sesudah/${namaFile}`;

    const { data, error } = await supabaseAdmin.storage
      .from('laporan-foto')
      .createSignedUploadUrl(pathFile);

    if (error || !data) {
      console.error('[upload-sesudah] Signed URL error:', error?.message);
      return apiError('INTERNAL_ERROR', 'Gagal membuat URL unggah di Supabase Storage.');
    }

    return apiSukses({
      upload_url: data.signedUrl,
      file_path: data.path,
      token: data.token,
      expires_in: 300,
    });
  } catch (err) {
    console.error('[upload-sesudah] Upload request failed:', err);
    return apiError('INTERNAL_ERROR', 'Gagal membuat URL unggah foto sesudah');
  }
}
