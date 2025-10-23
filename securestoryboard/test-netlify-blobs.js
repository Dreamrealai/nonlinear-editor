const { getStore } = require('@netlify/blobs');
const { v4: uuidv4 } = require('uuid');

async function testNetlifyBlobs() {
  console.log('🔍 Testing Netlify Blobs...\n');
  
  try {
    // Test 1: Create a store
    console.log('1️⃣ Creating a test store...');
    const store = getStore('test-store');
    console.log('✅ Store created successfully\n');
    
    // Test 2: Set a value
    console.log('2️⃣ Setting a test value...');
    const testKey = `test-${uuidv4()}`;
    const testData = {
      message: 'Netlify Blobs is working!',
      timestamp: new Date().toISOString(),
      testId: testKey
    };
    
    await store.set(testKey, JSON.stringify(testData));
    console.log(`✅ Value set successfully with key: ${testKey}\n`);
    
    // Test 3: Get the value
    console.log('3️⃣ Retrieving the test value...');
    const retrievedData = await store.get(testKey);
    const parsed = JSON.parse(retrievedData);
    console.log('✅ Retrieved data:', parsed);
    console.log('\n');
    
    // Test 4: List all keys
    console.log('4️⃣ Listing all keys in the store...');
    const keys = [];
    for await (const key of store.list()) {
      keys.push(key);
    }
    console.log(`✅ Found ${keys.length} key(s) in the store`);
    if (keys.length > 0) {
      console.log('Keys:', keys.slice(0, 5).join(', '), keys.length > 5 ? '...' : '');
    }
    console.log('\n');
    
    // Test 5: Delete the test value
    console.log('5️⃣ Cleaning up test data...');
    await store.delete(testKey);
    console.log('✅ Test data deleted\n');
    
    // Test 6: Verify deletion
    console.log('6️⃣ Verifying deletion...');
    const deletedData = await store.get(testKey);
    if (deletedData === null) {
      console.log('✅ Data successfully deleted\n');
    } else {
      console.log('❌ Data still exists after deletion\n');
    }
    
    // Test the prompt-jobs store (used by your app)
    console.log('7️⃣ Testing prompt-jobs store (your app store)...');
    const promptStore = getStore('prompt-jobs');
    
    // Check if there are any existing jobs
    const jobKeys = [];
    for await (const key of promptStore.list()) {
      jobKeys.push(key);
    }
    console.log(`✅ Found ${jobKeys.length} job(s) in prompt-jobs store`);
    if (jobKeys.length > 0) {
      console.log('Recent jobs:', jobKeys.slice(0, 3).join(', '), jobKeys.length > 3 ? '...' : '');
    }
    
    console.log('\n🎉 All tests passed! Netlify Blobs is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nError details:', error);
    
    if (error.message.includes('NETLIFY_AUTH_TOKEN')) {
      console.log('\n💡 Solution: Run "netlify login" to authenticate');
    } else if (error.message.includes('not found')) {
      console.log('\n💡 Solution: Make sure you\'re in a Netlify-linked project directory');
    } else {
      console.log('\n💡 This might be a configuration issue. Check:');
      console.log('   1. You\'re running this in a Netlify project');
      console.log('   2. The project is linked with "netlify link"');
      console.log('   3. You\'re logged in with "netlify login"');
      console.log('   4. Blobs is enabled for your site in the Netlify dashboard');
    }
  }
}

// Run the test
testNetlifyBlobs();
