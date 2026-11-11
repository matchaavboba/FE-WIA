/**
 * src/app/api/dashboard/insight/route.ts
 * Endpoint Civic Insight Otomatis Berbasis Template Kalimat Deskriptif (Tanpa Klaim Kausal)
 * Platform RAMPUNG — Pelaporan Aduan Warga Kota Surakarta
 */

import { NextRequest } from 'next/server';
import { DashboardFilterSchema, CivicInsight } from '@/lib/contracts/dashboard';
import { apiSukses, apiError } from '@/lib/server/response';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = DashboardFilterSchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Parameter filter tidak valid');
    }

    if (!isSupabaseConfigured()) {
      return apiError('SERVICE_UNAVAILABLE', 'Supabase belum dikonfigurasi untuk membuat insight dari data laporan.');
    }

    const tahunBerjalan = new Date().getFullYear();
    const [tren, konfirmasi] = await Promise.all([
      supabaseAdmin.rpc('fn_dashboard_tren', {
        p_periode_mulai: parsed.data.periode_mulai || `${tahunBerjalan}-01-01`,
        p_periode_akhir: parsed.data.periode_akhir || `${tahunBerjalan}-12-31`,
        p_kategori_slug: parsed.data.kategori || null,
        p_kecamatan_kode: parsed.data.kecamatan || null,
        p_kelurahan_kode: parsed.data.kelurahan || null,
        p_sumber: 'asli',
      }),
      supabaseAdmin.rpc('fn_dashboard_konfirmasi', {
        p_periode_mulai: parsed.data.periode_mulai || `${tahunBerjalan}-01-01`,
        p_periode_akhir: parsed.data.periode_akhir || `${tahunBerjalan}-12-31`,
        p_kategori_slug: parsed.data.kategori || null,
        p_kecamatan_kode: parsed.data.kecamatan || null,
        p_sumber: 'asli',
      }),
    ]);

    if (tren.error || konfirmasi.error) {
      return apiError('INTERNAL_ERROR', 'Gagal membuat insight. Pastikan migrasi fungsi dashboard sudah dijalankan.');
    }

    const daftarInsight: CivicInsight[] = [];
    const bulanTerakhir = tren.data?.[tren.data.length - 1];
    if (bulanTerakhir && Number(bulanTerakhir.jumlah_masuk) > 0) {
      daftarInsight.push({
        id: 'tren-laporan-terbaru',
        kategori: 'tren',
        judul: 'Ringkasan laporan periode terakhir',
        deskripsi: `${Number(bulanTerakhir.jumlah_masuk)} laporan masuk dan ${Number(bulanTerakhir.jumlah_selesai)} laporan selesai pada periode terakhir yang tersedia.`,
        tipe_penanda: 'netral',
        sumber_terkait: 'Laporan warga yang tersimpan di Supabase',
      });
    }

    const statistikKonfirmasi = konfirmasi.data?.[0];
    if (statistikKonfirmasi && Number(statistikKonfirmasi.total_dikonfirmasi) > 0) {
      daftarInsight.push({
        id: 'konfirmasi-pelapor',
        kategori: 'kepuasan',
        judul: 'Konfirmasi hasil oleh pelapor',
        deskripsi: `${Number(statistikKonfirmasi.total_dikonfirmasi)} laporan telah mendapat konfirmasi dari pelapor.`,
        tipe_penanda: 'netral',
        sumber_terkait: 'Konfirmasi pelapor yang tersimpan di Supabase',
      });
    }

    return apiSukses(daftarInsight, {
      sumber: [
        {
          provenance: 'asli',
          nama_sumber: 'Ringkasan laporan yang tersimpan di Supabase',
          waktu_pembaruan: new Date().toISOString(),
        },
      ],
      waktu_query: new Date().toISOString(),
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', 'Gagal memuat civic insight');
  }
}
