/**
 * src/app/api/referensi/kategori/route.ts
 * Endpoint Referensi Kategori Laporan & SLA Penanganan
 * Platform RAMPUNG — Pelaporan Aduan Warga Kota Surakarta
 */

import { NextRequest } from 'next/server';
import { apiSukses, apiError } from '@/lib/server/response';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return apiError('SERVICE_UNAVAILABLE', 'Supabase belum dikonfigurasi untuk memuat kategori.');
    }

    const { data, error } = await supabaseAdmin
      .from('kategori')
      .select('id, nama, slug, ikon, sla_hari, is_aktif, dinas:dinas_id(nama, singkatan)')
      .eq('is_aktif', true);

    if (error) {
      return apiError('INTERNAL_ERROR', 'Gagal memuat kategori dari Supabase.');
    }

    return apiSukses(data || []);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Gagal memuat kategori aduan');
  }
}
