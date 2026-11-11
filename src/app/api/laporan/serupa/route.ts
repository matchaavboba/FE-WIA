/**
 * src/app/api/laporan/serupa/route.ts
 * Endpoint Deteksi Laporan Serupa di Sekitar Lokasi
 * Platform RAMPUNG — Pelaporan Aduan Warga Kota Surakarta
 */

import { NextRequest } from 'next/server';
import { LaporanSerupaQuerySchema } from '@/lib/contracts/laporan';
import { apiSukses, apiError } from '@/lib/server/response';
import { getSupabasePublicClient, isSupabasePublicConfigured } from '@/lib/server/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = Object.fromEntries(searchParams.entries());

    const parsed = LaporanSerupaQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.errors[0]?.message || 'Parameter query tidak valid'
      );
    }

    const { kategori_id, latitude, longitude, radius_meter, maks } = parsed.data;
    if (!isSupabasePublicConfigured()) {
      return apiError('SERVICE_UNAVAILABLE', 'Supabase belum dikonfigurasi untuk mencari laporan serupa.');
    }

    const supabasePublic = getSupabasePublicClient();
    const { data, error } = await supabasePublic.rpc('fn_laporan_serupa', {
      p_kategori_id: kategori_id,
      p_latitude: latitude,
      p_longitude: longitude,
      p_radius_meter: radius_meter,
      p_maks: maks,
    });

    if (error) {
      return apiError('SERVICE_UNAVAILABLE', 'Deteksi laporan serupa sementara tidak tersedia.');
    }

    const candidates = data || [];
    if (candidates.length === 0) {
      return apiSukses([]);
    }

    const { data: realReports, error: realReportsError } = await supabasePublic
      .from('laporan_publik')
      .select('id')
      .eq('is_simulasi', false)
      .in('id', candidates.map((item: { id: string }) => item.id));

    if (realReportsError) {
      return apiError('INTERNAL_ERROR', 'Gagal memverifikasi laporan serupa dari Supabase.');
    }

    const realReportIds = new Set((realReports || []).map((item) => item.id));
    return apiSukses(candidates.filter((item: { id: string }) => realReportIds.has(item.id)));
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Gagal mendeteksi laporan serupa di sekitar lokasi');
  }
}
