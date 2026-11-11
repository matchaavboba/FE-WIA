/**
 * src/app/api/laporan/lacak/[kode]/route.ts
 * Endpoint Pelacakan Laporan Berdasarkan Kode Lacak (Resi Aduan Warga)
 * Platform RAMPUNG — Pelaporan Aduan Warga Kota Surakarta
 */

import { NextRequest } from 'next/server';
import { apiSukses, apiError } from '@/lib/server/response';
import { periksaRateLimit, hashIP } from '@/lib/server/rate-limit';
import { periksaKontenLaporan } from '@/lib/server/sanitizer';
import { getSupabasePublicClient, isSupabasePublicConfigured } from '@/lib/server/supabase-server';
import { formatBanyakUrlFoto } from '@/lib/server/upload';

export async function GET(
  req: NextRequest,
  { params }: { params: { kode: string } }
) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    // Sanitasi kode lacak: hilangkan tanda pagar '#', spasi, dan jadikan huruf kapital
    let kode = (params.kode || '').trim().replace(/^#/, '').toUpperCase();

    // 1. Rate Limiting Ketat Anti-Enumerasi (30 request/menit per IP)
    const rateCheck = periksaRateLimit(hashIP(ip), 'lacak_kode', 30, 60);
    if (!rateCheck.allowed) {
      return apiError(
        'RATE_LIMITED',
        `Terlalu banyak permintaan pelacakan. Silakan coba kembali dalam ${rateCheck.resetSeconds} detik.`
      );
    }

    if (!kode || kode.length < 5 || kode.length > 25) {
      return apiError('NOT_FOUND', 'Laporan dengan kode lacak tersebut tidak ditemukan.');
    }

    if (!isSupabasePublicConfigured()) {
      return apiError('SERVICE_UNAVAILABLE', 'Supabase belum dikonfigurasi untuk pelacakan langsung.');
    }

    // 2. Ambil data pelacakan dari Supabase.
    const supabasePublic = getSupabasePublicClient();
    const { data: laporan, error: laporanError } = await supabasePublic
      .from('laporan_publik')
      .select('*')
      .eq('kode_lacak', kode)
      .eq('is_simulasi', false)
      .maybeSingle();

    if (laporanError) {
      return apiError('INTERNAL_ERROR', 'Gagal membaca laporan dari Supabase.');
    }

    if (!laporan) {
      return apiError('NOT_FOUND', 'Laporan dengan kode lacak tersebut tidak ditemukan.');
    }

    const hasilAturan = periksaKontenLaporan(laporan.judul || '', laporan.deskripsi || '');
    const penanda = Array.isArray(laporan.penanda) ? [...laporan.penanda] : [];
    if (
      hasilAturan.penanda.length > 0 &&
      !penanda.includes('perlu_verifikasi_tambahan')
    ) {
      penanda.push('perlu_verifikasi_tambahan');
    }

    // 3. Ambil linimasa status history
    const { data: history, error: historyError } = await supabasePublic
      .from('status_history')
      .select('status_dari, status_ke, catatan, created_at')
      .eq('laporan_id', laporan.id)
      .order('created_at', { ascending: true });

    if (historyError) {
      return apiError('INTERNAL_ERROR', 'Gagal membaca riwayat status laporan.');
    }

    const createdDate = new Date(laporan.created_at);
    const now = new Date();
    const selisihHari = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24));

    return apiSukses({
      laporan: {
        ...laporan,
        penanda,
        foto_sebelum_paths: formatBanyakUrlFoto(laporan.foto_sebelum_paths || []),
        foto_sesudah_paths: formatBanyakUrlFoto(laporan.foto_sesudah_paths || []),
      },
      linimasa: history || [],
      sla: {
        hari_berjalan: selisihHari,
        status: laporan.status,
      },
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Terjadi kesalahan sistem saat melacak laporan');
  }
}
