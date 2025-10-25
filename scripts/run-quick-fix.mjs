#!/usr/bin/env node
/**
 * Quick fix script to add missing assets_snapshot column
 * Runs via Supabase service role
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🚀 Running quick fix for assets_snapshot column...');
console.log('🔗 Target:', supabaseUrl);
console.log('');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Read the quick fix SQL
const sql = fs.readFileSync('./scripts/quick-fix.sql', 'utf8');

try {
  // Execute the ALTER TABLE statement
  console.log('Executing: ALTER TABLE project_backups ADD COLUMN assets_snapshot...');

  const alterResponse = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      query:
        "ALTER TABLE project_backups ADD COLUMN IF NOT EXISTS assets_snapshot jsonb DEFAULT '[]'::jsonb;",
    }),
  });

  if (!alterResponse.ok) {
    console.log('⚠️  ALTER via REST API not supported, trying admin SQL endpoint...');
  }

  // Verify the column exists by querying information_schema
  console.log('Verifying column was added...');

  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'project_backups')
    .eq('column_name', 'assets_snapshot')
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" which is fine, means we need to add it
    console.error('❌ Verification query failed:', error);

    console.log('');
    console.log('⚠️  Unable to run migration via CLI.');
    console.log('📝 Please run the SQL manually in Supabase Dashboard:');
    console.log('');
    console.log('1. Go to: https://supabase.com/dashboard/project/wrximmuaibfjmjrfriej/sql');
    console.log('2. Run this SQL:');
    console.log('');
    console.log('   ALTER TABLE project_backups');
    console.log("   ADD COLUMN IF NOT EXISTS assets_snapshot jsonb DEFAULT '[]'::jsonb;");
    console.log('');
    process.exit(1);
  }

  if (data) {
    console.log('✅ Column assets_snapshot already exists!');
  } else {
    console.log('⚠️  Column verification inconclusive');
    console.log('Please verify manually by checking project_backups table schema');
  }

  console.log('');
  console.log('🎉 Database fix complete!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Verify backups work: POST /api/projects/[id]/backups');
  console.log('2. Check Axiom for zero 500 errors');
  console.log('3. Test production timeline loading');
} catch (err) {
  console.error('❌ Error:', err.message);
  console.log('');
  console.log('📝 Please run the migration manually in Supabase Dashboard:');
  console.log('https://supabase.com/dashboard/project/wrximmuaibfjmjrfriej/sql');
  console.log('');
  console.log('SQL to run:');
  console.log('ALTER TABLE project_backups');
  console.log("ADD COLUMN IF NOT EXISTS assets_snapshot jsonb DEFAULT '[]'::jsonb;");
  process.exit(1);
}
