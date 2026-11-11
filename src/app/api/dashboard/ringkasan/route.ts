/**
 * Endpoint ringkasan metrik beranda dari laporan yang tersimpan di Supabase.
 */

import { NextRequest } from 'next/server';
import { RingkasanLanding } from '@/lib/contracts/dashboard';
import { apiSukses, apiError } from '@/lib/server/response';
import { getSupabasePublicClient, isSupabasePublicConfigured } from '@/lib/server/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    if (!isSupabasePublicConfigured()) {
      return apiError('SERVICE_UNAVAILABLE', 'Supabase belum dikonfigurasi untuk memuat ringkasan langsung.');
    }

    const now = new Date();
    const mulaiBulan = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const akhirBulan = now.toISOString();
    const supabasePublic = getSupabasePublicClient();
    const [total, selesai, dikerjakan] = await Promise.all([
      supabasePublic
        .from('laporan_publik')
        .select('id', { count: 'exact', head: true })
        .eq('is_simulasi', false)
        .gte('created_at', mulaiBulan)
        .lte('created_at', akhirBulan),
      supabasePublic
        .from('laporan_publik')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'selesai')
        .eq('is_simulasi', false)
        .gte('created_at', mulaiBulan)
        .lte('created_at', akhirBulan),
      supabasePublic
        .from('laporan_publik')
        .select('id', { count: 'exact', head: true })
        .in('status', ['ditinjau', 'sedang_ditangani'])
        .eq('is_simulasi', false)
        .gte('created_at', mulaiBulan)
        .lte('created_at', akhirBulan),
    ]);

    if (total.error || selesai.error || dikerjakan.error) {
      return apiError('INTERNAL_ERROR', 'Gagal menghitung ringkasan dari Supabase.');
    }

    const jumlahMasuk = total.count || 0;
    const jumlahSelesai = selesai.count || 0;
    const data: RingkasanLanding = {
      laporan_bulan_ini: jumlahMasuk,
      laporan_selesai: jumlahSelesai,
      persentase_selesai: jumlahMasuk ? Number(((jumlahSelesai / jumlahMasuk) * 100).toFixed(1)) : 0,
      sedang_dikerjakan: dikerjakan.count || 0,
      rata_rata_harian: Number((jumlahMasuk / now.getDate()).toFixed(1)),
      kinerja_dinas: [],
    };

    return apiSukses(data, {
      sumber: [
        {
          provenance: 'asli',
          nama_sumber: 'Laporan yang tersimpan di Supabase',
          waktu_pembaruan: now.toISOString(),
        },
      ],
      waktu_query: now.toISOString(),
    });
  } catch {
    return apiError('INTERNAL_ERROR', 'Gagal memuat ringkasan dashboard');
  }
}
