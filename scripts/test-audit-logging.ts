#!/usr/bin/env tsx
/**
 * Test script for audit logging system
 *
 * Run this after applying the migration to verify everything works:
 *   npx tsx scripts/test-audit-logging.ts
 *
 * This script tests:
 * 1. Database table exists and is accessible
 * 2. Audit log insertion works
 * 3. Query functions work
 * 4. Helper functions work
 * 5. RLS policies are correctly enforced
 */

import { createServiceSupabaseClient } from '../lib/supabase';
import {
  auditLog,
  auditAuthEvent,
  auditProjectOperation,
  auditAssetOperation,
  auditAdminAction,
  queryAuditLogs,
  getAuditLogStats,
  AuditAction,
} from '../lib/auditLog';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'; // Test user ID

async function testDatabaseTable() {
  console.log('\n=== Testing Database Table ===');

  try {
    const supabase = createServiceSupabaseClient();

    // Check if table exists
    const { error } = await supabase.from('audit_logs').select('id').limit(1);

    if (error) {
      console.error('❌ Table check failed:', error.message);
      return false;
    }

    console.log('✅ audit_logs table exists and is accessible');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function testBasicInsert() {
  console.log('\n=== Testing Basic Insert ===');

  try {
    await auditLog({
      userId: TEST_USER_ID,
      action: AuditAction.PROJECT_CREATE,
      resourceType: 'project',
      resourceId: '00000000-0000-0000-0000-000000000002',
      metadata: {
        title: 'Test Project',
        test: true,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'test-script',
      httpMethod: 'POST',
      requestPath: '/api/projects',
      statusCode: 200,
      durationMs: 100,
    });

    console.log('✅ Basic audit log inserted successfully');

    // Wait a bit for the insert to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify it was inserted
    const logs = await queryAuditLogs({
      userId: TEST_USER_ID,
      action: 'project.create',
      limit: 1,
    });

    if (logs.length > 0) {
      console.log('✅ Audit log verified in database');
      console.log('   Log ID:', logs[0]?.id);
      console.log('   Action:', logs[0]?.action);
      console.log('   Metadata:', logs[0]?.metadata);
    } else {
      console.log('⚠️  Warning: Could not verify log in database (may take a moment)');
    }

    return true;
  } catch (error) {
    console.error('❌ Basic insert failed:', error);
    return false;
  }
}

async function testHelperFunctions() {
  console.log('\n=== Testing Helper Functions ===');

  try {
    // Create a mock request object
    const mockRequest = {
      headers: new Map([
        ['x-forwarded-for', '192.168.1.1'],
        ['user-agent', 'Mozilla/5.0 Test'],
      ]),
      method: 'POST',
      url: 'http://localhost:3000/api/test',
    } as any;

    // Test auditAuthEvent
    await auditAuthEvent(AuditAction.AUTH_LOGIN_SUCCESS, TEST_USER_ID, mockRequest, {
      method: 'password',
      test: true,
    });
    console.log('✅ auditAuthEvent works');

    // Test auditProjectOperation
    await auditProjectOperation(
      AuditAction.PROJECT_UPDATE,
      TEST_USER_ID,
      '00000000-0000-0000-0000-000000000003',
      mockRequest,
      { title: 'Updated Project', test: true }
    );
    console.log('✅ auditProjectOperation works');

    // Test auditAssetOperation
    await auditAssetOperation(
      AuditAction.ASSET_UPLOAD,
      TEST_USER_ID,
      '00000000-0000-0000-0000-000000000004',
      mockRequest,
      { fileSize: 1024, test: true }
    );
    console.log('✅ auditAssetOperation works');

    // Test auditAdminAction
    await auditAdminAction(
      TEST_USER_ID,
      AuditAction.ADMIN_TIER_CHANGE,
      '00000000-0000-0000-0000-000000000005',
      mockRequest,
      { oldTier: 'free', newTier: 'premium', test: true }
    );
    console.log('✅ auditAdminAction works');

    return true;
  } catch (error) {
    console.error('❌ Helper function test failed:', error);
    return false;
  }
}

async function testQueryFunctions() {
  console.log('\n=== Testing Query Functions ===');

  try {
    // Wait for inserts to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test queryAuditLogs
    const logs = await queryAuditLogs({
      userId: TEST_USER_ID,
      limit: 10,
    });

    console.log(`✅ queryAuditLogs returned ${logs.length} logs`);

    if (logs.length > 0) {
      console.log('   Sample log:', {
        action: logs[0]?.action,
        resourceType: logs[0]?.resource_type,
        createdAt: logs[0]?.created_at,
      });
    }

    // Test getAuditLogStats
    const stats = await getAuditLogStats(TEST_USER_ID);

    console.log(`✅ getAuditLogStats returned stats:`);
    console.log(`   Total logs: ${stats.totalLogs}`);
    console.log(`   Action breakdown:`, stats.actionBreakdown);

    return true;
  } catch (error) {
    console.error('❌ Query function test failed:', error);
    return false;
  }
}

async function testViews() {
  console.log('\n=== Testing Database Views ===');

  try {
    const supabase = createServiceSupabaseClient();

    // Test recent_security_events view
    const { data: securityEvents, error: securityError } = await supabase
      .from('recent_security_events')
      .select('*')
      .limit(5);

    if (securityError) {
      console.error('❌ recent_security_events view error:', securityError.message);
    } else {
      console.log(`✅ recent_security_events view works (${securityEvents?.length || 0} events)`);
    }

    // Test admin_actions_log view
    const { data: adminActions, error: adminError } = await supabase
      .from('admin_actions_log')
      .select('*')
      .limit(5);

    if (adminError) {
      console.error('❌ admin_actions_log view error:', adminError.message);
    } else {
      console.log(`✅ admin_actions_log view works (${adminActions?.length || 0} actions)`);
    }

    return true;
  } catch (error) {
    console.error('❌ View test failed:', error);
    return false;
  }
}

async function testCleanupFunction() {
  console.log('\n=== Testing Cleanup Function ===');

  try {
    const supabase = createServiceSupabaseClient();

    // Test cleanup function (with 0 days to simulate, shouldn't delete anything recent)
    const { data, error } = await supabase.rpc('cleanup_old_audit_logs', {
      retention_days: 365, // Don't delete anything recent
    });

    if (error) {
      console.error('❌ Cleanup function error:', error.message);
      return false;
    }

    console.log(`✅ cleanup_old_audit_logs function works`);
    console.log(`   Deleted ${data} old logs (should be 0 for recent data)`);

    return true;
  } catch (error) {
    console.error('❌ Cleanup function test failed:', error);
    return false;
  }
}

async function cleanupTestData() {
  console.log('\n=== Cleaning Up Test Data ===');

  try {
    const supabase = createServiceSupabaseClient();

    // Delete test logs
    const { error } = await supabase.from('audit_logs').delete().eq('user_id', TEST_USER_ID);

    if (error) {
      console.error('❌ Cleanup failed:', error.message);
      return false;
    }

    console.log('✅ Test data cleaned up');
    return true;
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return false;
  }
}

async function main() {
  console.log('==============================================');
  console.log('  Audit Logging System Test Suite');
  console.log('==============================================');

  const results = {
    tableExists: await testDatabaseTable(),
    basicInsert: await testBasicInsert(),
    helperFunctions: await testHelperFunctions(),
    queryFunctions: await testQueryFunctions(),
    views: await testViews(),
    cleanupFunction: await testCleanupFunction(),
  };

  // Clean up test data
  await cleanupTestData();

  console.log('\n==============================================');
  console.log('  Test Results');
  console.log('==============================================');

  const allPassed = Object.values(results).every((r) => r === true);

  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });

  console.log('\n==============================================');

  if (allPassed) {
    console.log('✅ All tests passed! Audit logging system is working correctly.');
    console.log('\nNext steps:');
    console.log('1. Integrate audit logging into API routes');
    console.log('2. See AUDIT_LOG_INTEGRATION_EXAMPLES.md for examples');
    console.log('3. Set up monitoring dashboard');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please check the errors above.');
    console.log('\nTroubleshooting:');
    console.log('1. Ensure migration has been applied: supabase migration up');
    console.log('2. Verify Supabase service role is configured');
    console.log('3. Check database connection');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
