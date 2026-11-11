/**
 * src/app/api/laporan/saya/route.ts
 * Endpoint Daftar Laporan Milik Pengguna yang Sedang Login
 * Platform RAMPUNG — Pelaporan Aduan Warga Kota Surakarta
 */

import { NextRequest } from 'next/server';
import { apiSukses, apiError } from '@/lib/server/response';
import { dapatkanKonteksAuth } from '@/lib/server/auth';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return apiError('SERVICE_UNAVAILABLE', 'Supabase belum dikonfigurasi untuk memuat riwayat akun.');
    }

    const auth = await dapatkanKonteksAuth();
    if (!auth.isAuthenticated || !auth.userId) {
      return apiError('UNAUTHORIZED', 'Silakan masuk untuk melihat riwayat laporan Anda');
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 50);

    let query = supabaseAdmin
      .from('laporan')
      .select('id, kode_lacak, judul, deskripsi, status, penanda, foto_sebelum_paths, foto_sesudah_paths, created_at, updated_at, kategori:kategori_id(nama, slug, ikon), kelurahan:kelurahan_id(nama)')
      .eq('pelapor_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: records, error } = await query;

    if (error) {
      return apiError('INTERNAL_ERROR', 'Gagal memuat laporan milik akun ini.');
    }

    let hasNext = false;
    let items = records || [];
    if (items.length > limit) {
      hasNext = true;
      items = items.slice(0, limit);
    }

    const nextCursor = hasNext && items.length > 0 ? items[items.length - 1].created_at : null;

    return apiSukses(items, {
      cursor_berikutnya: nextCursor,
      sumber: [
        {
          provenance: 'asli',
          nama_sumber: 'Riwayat Pelaporan Pengguna RAMPUNG',
          waktu_pembaruan: new Date().toISOString(),
        },
      ],
      waktu_query: new Date().toISOString(),
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Gagal memuat riwayat laporan');
  }
}
