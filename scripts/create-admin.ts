#!/usr/bin/env tsx
// =============================================================================
// Create Admin User
// =============================================================================
// This script upgrades an existing user to admin tier
// Run with: npx tsx scripts/create-admin.ts <user-email>
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Usage: npx tsx scripts/create-admin.ts <user-email>');
    process.exit(1);
  }

  console.log(`🔍 Looking for user: ${email}...\n`);

  try {
    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      console.error(`❌ User not found: ${email}`);
      console.log('\nℹ️  Make sure the user has signed up first.');
      process.exit(1);
    }

    // Update to admin tier
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ tier: 'admin' })
      .eq('id', profile.id);

    if (updateError) {
      console.error('❌ Error updating user:', updateError);
      process.exit(1);
    }

    console.log('✅ User upgraded to admin successfully!\n');
    console.log('Email:', email);
    console.log('User ID:', profile.id);
    console.log('New Tier: ADMIN');
    console.log('\n🎉 You can now access the admin dashboard at /admin');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
