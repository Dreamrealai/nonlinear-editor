#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Read the migration file
const migrationPath = path.join(
  __dirname,
  '../supabase/migrations/20251025140000_critical_production_fix.sql'
);
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Running production database migration...');
console.log('📄 Migration: 20251025140000_critical_production_fix.sql');
console.log('🔗 Target:', supabaseUrl);
console.log('');

// Split SQL into individual statements (handle DO blocks and other complex SQL)
const statements = migrationSQL
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith('--'));

let successCount = 0;
let failureCount = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i] + ';';

  // Skip comments
  if (statement.trim().startsWith('--')) continue;

  console.log(`Executing statement ${i + 1}/${statements.length}...`);

  try {
    const { error } = await supabase.rpc('exec_sql', { query_string: statement });

    if (error) {
      console.error(`❌ Statement ${i + 1} failed:`, error.message);
      failureCount++;
    } else {
      console.log(`✅ Statement ${i + 1} succeeded`);
      successCount++;
    }
  } catch (err) {
    console.error(`❌ Statement ${i + 1} error:`, err.message);
    failureCount++;
  }
}

console.log('');
console.log('📊 Migration Summary:');
console.log(`  ✅ Successful: ${successCount}`);
console.log(`  ❌ Failed: ${failureCount}`);
console.log(`  📝 Total: ${statements.length}`);

if (failureCount === 0) {
  console.log('');
  console.log('🎉 All migration statements executed successfully!');
  process.exit(0);
} else {
  console.log('');
  console.log('⚠️  Some statements failed. Check errors above.');
  process.exit(1);
}
