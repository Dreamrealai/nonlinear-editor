#!/usr/bin/env tsx

/**
 * Simple check that processing_jobs table exists
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigration() {
  console.log('🔍 Checking processing_jobs table...\n');

  try {
    // Query the table to verify it exists
    const { data, error } = await supabase
      .from('processing_jobs')
      .select('id, job_type, status, provider, created_at')
      .limit(5);

    if (error) {
      console.error('❌ Table check failed:', error.message);
      return;
    }

    console.log('✅ SUCCESS! processing_jobs table exists and is accessible');
    console.log(`📊 Current jobs in database: ${data?.length || 0}`);

    if (data && data.length > 0) {
      console.log('\nExisting jobs:');
      data.forEach(job => {
        console.log(`  - ${job.job_type} (${job.status}) - ${job.provider}`);
      });
    } else {
      console.log('\n💡 No jobs in the database yet (this is normal)');
    }

    console.log('\n🎉 Migration verified successfully!');
    console.log('The video-to-audio feature is ready to use.');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

checkMigration();
