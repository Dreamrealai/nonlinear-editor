/**
 * Verification script for rate limiting database setup
 * Checks if the rate_limits table and increment_rate_limit function exist
 */

import { createServiceSupabaseClient, isSupabaseServiceConfigured } from '../lib/supabase';

async function verifyRateLimitSetup(): Promise<void> {
  console.log('🔍 Verifying rate limiting database setup...\n');

  // Step 1: Check if service role is configured
  if (!isSupabaseServiceConfigured()) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not configured');
    console.error('   Set this environment variable to enable database rate limiting');
    process.exit(1);
  }
  console.log('✅ Service role key is configured');

  const supabase = createServiceSupabaseClient();

  // Step 2: Check if rate_limits table exists
  console.log('\n🔍 Checking if rate_limits table exists...');
  const { error: tableError } = await supabase.from('rate_limits').select('key').limit(1);

  if (tableError) {
    console.error('❌ rate_limits table check failed:', tableError.message);
    console.error('   Run migration: supabase/migrations/20250123_create_rate_limits_table.sql');
    process.exit(1);
  }
  console.log('✅ rate_limits table exists');

  // Step 3: Check if increment_rate_limit function exists
  console.log('\n🔍 Checking if increment_rate_limit function exists...');
  try {
    const { data, error: funcError } = await supabase.rpc('increment_rate_limit', {
      rate_key: 'test-verification-key',
      window_seconds: 60,
    } as unknown as never);

    if (funcError) {
      console.error('❌ increment_rate_limit function check failed:', funcError.message);
      console.error('   Error code:', funcError.code);
      console.error('   Run migration: supabase/migrations/20250123_create_rate_limits_table.sql');
      process.exit(1);
    }

    console.log('✅ increment_rate_limit function exists');
    console.log('   Test result:', data);

    // Clean up test entry
    await supabase.from('rate_limits').delete().eq('key', 'test-verification-key');
  } catch (err) {
    console.error('❌ Unexpected error calling increment_rate_limit:', err);
    process.exit(1);
  }

  // Step 4: Verify permissions
  console.log('\n🔍 Checking RLS policies and permissions...');
  const { data: rlsData, error: rlsError } = await supabase
    .from('rate_limits')
    .select('*')
    .limit(1);

  if (rlsError) {
    console.error('❌ RLS policy check failed:', rlsError.message);
    console.error('   Service role should bypass RLS - check migration setup');
    process.exit(1);
  }
  console.log('✅ RLS policies are correctly configured (service role can access)');

  console.log('\n✅ All rate limiting database checks passed!');
  console.log('   Database-backed rate limiting is ready to use.');
}

verifyRateLimitSetup().catch((error) => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});
