/**
 * src/app/api/laporan/upload-foto/route.ts
 * Endpoint Perolehan Signed URL Unggah Foto ke Supabase Storage
 * Platform RAMPUNG — Pelaporan Aduan Warga Kota Surakarta
 */

import { NextRequest } from 'next/server';
import { apiSukses, apiError } from '@/lib/server/response';
import {
  generateNamaFileAcak,
  deteksiMimeTypeDariBuffer,
  formatUrlFoto,
  dapatkanThumbnailUrl,
} from '@/lib/server/upload';
import { periksaRateLimit, hashIP } from '@/lib/server/rate-limit';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    // Rate limit: maks 20 permintaan upload foto per jam per IP
    const limitCheck = periksaRateLimit(hashIP(ip), 'upload_foto', 20, 3600);
    if (!limitCheck.allowed) {
      return apiError('RATE_LIMITED', 'Batas upload tercapai. Silakan coba kembali beberapa saat lagi.');
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
      const pathFile = `sebelum/${generateNamaFileAcak(ekstensi)}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('laporan-foto')
        .upload(pathFile, buffer, { contentType: validasi.mimeType, upsert: false });

      if (uploadError) {
        console.error('[upload-foto] Storage upload error:', uploadError.message);
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
      return apiError(
        'VALIDATION_ERROR',
        'Tipe berkas tidak didukung. Harap unggah foto dengan format JPG, PNG, atau WebP.'
      );
    }

    const ekstensi = tipe === 'image/png' ? 'png' : tipe === 'image/webp' ? 'webp' : 'jpg';
    const namaFile = generateNamaFileAcak(ekstensi);
    const pathFile = `sebelum/${namaFile}`;

    // Dapatkan Signed Upload URL dari Supabase Storage (Privat)
    const { data, error } = await supabaseAdmin.storage
      .from('laporan-foto')
      .createSignedUploadUrl(pathFile);

    if (error || !data) {
      return apiError('INTERNAL_ERROR', 'Gagal membuat URL unggah di Supabase Storage.');
    }

    return apiSukses({
      upload_url: data.signedUrl,
      file_path: data.path,
      token: data.token,
      expires_in: 300,
    });
  } catch (err) {
    console.error('[upload-foto] Upload request failed:', err);
    return apiError('INTERNAL_ERROR', 'Gagal memproses unggah foto');
  }
}
