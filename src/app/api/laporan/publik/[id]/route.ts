/**
 * src/app/api/laporan/publik/[id]/route.ts
 * Endpoint Detail Laporan Publik Tunggal (Bebas PII)
 * Platform RAMPUNG — Pelaporan Aduan Warga Kota Surakarta
 */

import { NextRequest } from 'next/server';
import { apiSukses, apiError } from '@/lib/server/response';
import { getSupabasePublicClient, isSupabasePublicConfigured } from '@/lib/server/supabase-server';
import { formatBanyakUrlFoto } from '@/lib/server/upload';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!isSupabasePublicConfigured()) {
      return apiError('SERVICE_UNAVAILABLE', 'Supabase belum dikonfigurasi untuk memuat laporan.');
    }

    const supabasePublic = getSupabasePublicClient();
    const { data: laporan, error } = await supabasePublic
      .from('laporan_publik')
      .select('*')
      .eq('id', id)
      .eq('is_simulasi', false)
      .single();

    if (error || !laporan) {
      return apiError('NOT_FOUND', 'Laporan tidak ditemukan');
    }

    // Ambil linimasa status publik
    const { data: history, error: historyError } = await supabasePublic
      .from('status_history')
      .select('status_dari, status_ke, catatan, created_at')
      .eq('laporan_id', id)
      .order('created_at', { ascending: true });

    if (historyError) {
      return apiError('INTERNAL_ERROR', 'Gagal memuat riwayat status laporan.');
    }

    return apiSukses({
      ...laporan,
      foto_sebelum_paths: formatBanyakUrlFoto(laporan.foto_sebelum_paths || []),
      foto_sesudah_paths: formatBanyakUrlFoto(laporan.foto_sesudah_paths || []),
      linimasa: history || [],
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Gagal memuat detail laporan');
  }
}
