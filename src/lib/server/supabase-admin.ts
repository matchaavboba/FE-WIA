/**
 * src/lib/server/supabase-admin.ts
 * Supabase Admin Client (Service Role) — HANYA UNTUK SERVER
 * Platform RAMPUNG — Pelaporan Aduan Warga Kota Surakarta
 * 
 * ⚠️ PERINGATAN KEAMANAN:
 * File ini TIDAK BOLEH diimpor oleh komponen client (use client) apapun.
 * Kunci Service Role membypass seluruh Row Level Security.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key';

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
      anonKey &&
      serviceRoleKey &&
      !url.includes('your-project') &&
      !anonKey.includes('your-anon-key') &&
      !serviceRoleKey.includes('your-service-role-key')
  );
}

// Cek keamanan lingkungan runtime
if (typeof window !== 'undefined') {
  throw new Error('FATAL: supabase-admin.ts dieksekusi di lingkungan browser! Bahaya kebocoran service role key.');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
