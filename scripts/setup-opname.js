// Script to setup Opname Stok entries
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jlmrhnqgbktamxqdumzk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsbXJobnFnYmt0YW14cWR1bXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNTU1NTQsImV4cCI6MjA3NTgzMTU1NH0.zcIeKRFulIor3H5aC2mzce-bNXJRRCjkIIDMCpAdXvs";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setup() {
  // Insert Opname Stok for jenis_stok_masuk
  const { data: masukData, error: masukError } = await supabase
    .from('jenis_stok_masuk')
    .upsert({ name: 'Opname Stok' }, { onConflict: 'name' })
    .select();

  if (masukError) {
    console.error('Error creating jenis_stok_masuk:', masukError);
  } else {
    console.log('Created jenis_stok_masuk:', masukData);
  }

  // Insert Opname Stok for jenis_stok_keluar
  const { data: keluarData, error: keluarError } = await supabase
    .from('jenis_stok_keluar')
    .upsert({ name: 'Opname Stok', tujuan_category: 'SAJ_PUSAT' }, { onConflict: 'name' })
    .select();

  if (keluarError) {
    console.error('Error creating jenis_stok_keluar:', keluarError);
  } else {
    console.log('Created jenis_stok_keluar:', keluarData);
  }
}

setup();
