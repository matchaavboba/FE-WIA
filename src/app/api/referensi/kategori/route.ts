/**
 * src/app/api/referensi/kategori/route.ts
 * Endpoint Referensi Kategori Laporan & SLA Penanganan
 * Platform RAMPUNG — Pelaporan Aduan Warga Kota Surakarta
 */

import { NextRequest } from 'next/server';
import { apiSukses, apiError } from '@/lib/server/response';
import { getSupabasePublicClient, isSupabasePublicConfigured } from '@/lib/server/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!isSupabasePublicConfigured()) {
      return apiError('SERVICE_UNAVAILABLE', 'Supabase belum dikonfigurasi untuk memuat kategori.');
    }

    const { data, error } = await getSupabasePublicClient()
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
