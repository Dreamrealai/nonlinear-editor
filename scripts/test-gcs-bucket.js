const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

let credentials, bucketName;
for (const line of envLines) {
  if (line.startsWith('GOOGLE_SERVICE_ACCOUNT=')) {
    const jsonStr = line.substring('GOOGLE_SERVICE_ACCOUNT='.length);
    credentials = JSON.parse(jsonStr);
  }
  if (line.startsWith('GCS_BUCKET_NAME=')) {
    bucketName = line.substring('GCS_BUCKET_NAME='.length).trim();
  }
}

if (!credentials) {
  console.error('❌ GOOGLE_SERVICE_ACCOUNT not found in .env.local');
  process.exit(1);
}

if (!bucketName) {
  console.error('❌ GCS_BUCKET_NAME not found in .env.local');
  process.exit(1);
}

const storage = new Storage({ credentials });

async function testBucket() {
  try {
    console.log(`🧪 Testing GCS bucket: ${bucketName}\n`);

    // Test 1: Check bucket exists
    const bucket = storage.bucket(bucketName);
    const [exists] = await bucket.exists();

    if (!exists) {
      console.error('❌ Bucket does not exist');
      process.exit(1);
    }
    console.log('✅ Bucket exists');

    // Test 2: Get bucket metadata
    const [metadata] = await bucket.getMetadata();
    console.log(`✅ Bucket metadata retrieved`);
    console.log(`   📍 Location: ${metadata.location}`);
    console.log(`   💾 Storage Class: ${metadata.storageClass}`);

    // Test 3: Upload a test file
    console.log('\n🧪 Testing file upload...');
    const testFileName = `test-${Date.now()}.txt`;
    const testFilePath = `test-uploads/${testFileName}`;
    const testContent = 'This is a test file for GCS bucket verification';

    const file = bucket.file(testFilePath);
    await file.save(testContent, {
      metadata: {
        contentType: 'text/plain',
        metadata: {
          testFile: 'true',
          uploadedAt: new Date().toISOString(),
        },
      },
    });
    console.log(`✅ File uploaded: gs://${bucketName}/${testFilePath}`);

    // Test 4: Read the file back
    console.log('🧪 Testing file download...');
    const [downloadedContent] = await file.download();
    const contentString = downloadedContent.toString('utf8');

    if (contentString === testContent) {
      console.log('✅ File download verified');
    } else {
      console.error('❌ Downloaded content does not match');
      process.exit(1);
    }

    // Test 5: Delete the test file
    console.log('🧪 Testing file deletion...');
    await file.delete();
    console.log('✅ File deleted successfully');

    // Test 6: Verify deletion
    const [fileExists] = await file.exists();
    if (!fileExists) {
      console.log('✅ Deletion verified');
    } else {
      console.error('❌ File still exists after deletion');
      process.exit(1);
    }

    console.log('\n🎉 All tests passed! GCS bucket is ready for use.');
    console.log(`\n📋 Summary:`);
    console.log(`   Bucket: ${bucketName}`);
    console.log(`   Location: ${metadata.location}`);
    console.log(`   Storage Class: ${metadata.storageClass}`);
    console.log(`   URI: gs://${bucketName}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testBucket();
