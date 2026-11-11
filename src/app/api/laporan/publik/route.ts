/**
 * src/app/api/laporan/publik/route.ts
 * Endpoint Daftar Laporan Publik (Cursor Pagination + Filter + Ringkas/Lengkap)
 * Platform RAMPUNG — Pelaporan Aduan Warga Kota Surakarta
 */

import { NextRequest } from 'next/server';
import { LaporanPublikFilterSchema } from '@/lib/contracts/laporan';
import { apiSukses, apiError } from '@/lib/server/response';
import { periksaKontenLaporan } from '@/lib/server/sanitizer';
import { getSupabasePublicClient, isSupabasePublicConfigured } from '@/lib/server/supabase-server';
import { dapatkanThumbnailUrl, formatBanyakUrlFoto } from '@/lib/server/upload';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = Object.fromEntries(searchParams.entries());

    const parsed = LaporanPublikFilterSchema.safeParse(rawQuery);
    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        parsed.error.errors[0]?.message || 'Parameter query filter tidak valid'
      );
    }

    const {
      kategori,
      kecamatan,
      kelurahan,
      status,
      pencarian,
      cursor,
      limit,
      fields,
    } = parsed.data;

    if (!isSupabasePublicConfigured()) {
      return apiError('SERVICE_UNAVAILABLE', 'Supabase belum dikonfigurasi untuk memuat data langsung.');
    }

    let query = getSupabasePublicClient()
      .from('laporan_publik')
      .select('*')
      .eq('is_simulasi', false)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (kategori) {
      query = query.eq('kategori_slug', kategori);
    }
    if (kecamatan) {
      query = query.eq('kecamatan_kode', kecamatan);
    }
    if (kelurahan) {
      query = query.eq('kelurahan_kode', kelurahan);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (pencarian) {
      query = query.ilike('judul', `%${pencarian}%`);
    }
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('[GET /api/laporan/publik] Supabase query failed', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return apiError('INTERNAL_ERROR', 'Gagal membaca daftar laporan dari Supabase.');
    }

    let hasNextPage = false;
    let items = records || [];
    if (items.length > limit) {
      hasNextPage = true;
      items = items.slice(0, limit);
    }

    const nextCursor = hasNextPage && items.length > 0 ? items[items.length - 1].created_at : null;

    // Field selection untuk respons ringkas mobile
    const sanitizedItems = items.map((item: any) => {
      const fotoSebelumUrls = formatBanyakUrlFoto(item.foto_sebelum_paths || []);
      const fotoSesudahUrls = formatBanyakUrlFoto(item.foto_sesudah_paths || []);
      const hasilAturan = periksaKontenLaporan(item.judul || '', item.deskripsi || '');
      const penanda = Array.isArray(item.penanda) ? [...item.penanda] : [];
      if (
        hasilAturan.penanda.length > 0 &&
        !penanda.includes('perlu_verifikasi_tambahan')
      ) {
        penanda.push('perlu_verifikasi_tambahan');
      }
      const thumbnail = item.foto_sebelum_paths?.[0]
        ? dapatkanThumbnailUrl(item.foto_sebelum_paths[0])
        : null;

      if (fields === 'ringkas') {
        return {
          id: item.id,
          kode_lacak: item.kode_lacak,
          judul: item.judul,
          kategori: item.kategori,
          kelurahan: item.kelurahan,
          status: item.status,
          penanda,
          thumbnail,
          jumlah_dukungan: item.jumlah_dukungan,
          created_at: item.created_at,
          is_simulasi: item.is_simulasi,
          provenance: item.provenance,
        };
      }
      return {
        ...item,
        penanda,
        foto_sebelum_paths: fotoSebelumUrls,
        foto_sesudah_paths: fotoSesudahUrls,
        thumbnail,
      };
    });

    return apiSukses(sanitizedItems, {
      cursor_berikutnya: nextCursor,
      sumber: [
        {
          provenance: 'asli',
          nama_sumber: 'Data Publik RAMPUNG Kota Surakarta',
          waktu_pembaruan: new Date().toISOString(),
        },
      ],
      waktu_query: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error(
      '[GET /api/laporan/publik] Unexpected error',
      err instanceof Error ? err.message : 'Unknown error'
    );
    return apiError('INTERNAL_ERROR', 'Gagal memuat daftar laporan publik');
  }
}
