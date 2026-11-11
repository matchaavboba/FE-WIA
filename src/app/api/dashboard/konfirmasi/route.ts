/**
 * src/app/api/dashboard/konfirmasi/route.ts
 * Endpoint Statistik Kepuasan Konfirmasi Warga & Tingkat Buka Ulang (Reopen)
 * Platform RAMPUNG — Pelaporan Aduan Warga Kota Surakarta
 */

import { NextRequest } from 'next/server';
import { DashboardFilterSchema } from '@/lib/contracts/dashboard';
import { apiSukses, apiError } from '@/lib/server/response';
import { getSupabasePublicClient, isSupabasePublicConfigured } from '@/lib/server/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = DashboardFilterSchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Parameter filter tidak valid');
    }

    const { periode_mulai, periode_akhir, kategori, kecamatan, sumber } = parsed.data;
    const tahunBerjalan = new Date().getFullYear();

    if (!isSupabasePublicConfigured()) {
      return apiError('SERVICE_UNAVAILABLE', 'Supabase belum dikonfigurasi untuk memuat konfirmasi langsung.');
    }

    const { data, error } = await getSupabasePublicClient().rpc('fn_dashboard_konfirmasi', {
      p_periode_mulai: periode_mulai || `${tahunBerjalan}-01-01`,
      p_periode_akhir: periode_akhir || `${tahunBerjalan}-12-31`,
      p_kategori_slug: kategori || null,
      p_kecamatan_kode: kecamatan || null,
      p_sumber: sumber === 'simulasi' ? 'simulasi' : 'asli',
    });

    if (error) {
      return apiError('INTERNAL_ERROR', 'Gagal memuat konfirmasi dari Supabase. Pastikan migrasi fungsi dashboard sudah dijalankan.');
    }

    const res = data?.[0] || {
      total_selesai: 0,
      total_dikonfirmasi: 0,
      persen_dikonfirmasi: 0,
      persen_puas: 0,
      persen_biasa: 0,
      persen_kurang_puas: 0,
      total_dibuka_ulang: 0,
      persen_dibuka_ulang: 0,
    };

    return apiSukses(res, {
      sumber: [
        {
          provenance: sumber === 'simulasi' ? 'simulasi_terkalibrasi' : 'asli',
          nama_sumber: 'Verifikasi Dua Arah Pelapor RAMPUNG',
          waktu_pembaruan: new Date().toISOString(),
        },
      ],
      waktu_query: new Date().toISOString(),
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Gagal memuat data statistik konfirmasi');
  }
}
