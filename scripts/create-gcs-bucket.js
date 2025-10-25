const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

let credentials;
for (const line of envLines) {
  if (line.startsWith('GOOGLE_SERVICE_ACCOUNT=')) {
    const jsonStr = line.substring('GOOGLE_SERVICE_ACCOUNT='.length);
    credentials = JSON.parse(jsonStr);
    break;
  }
}

if (!credentials) {
  console.error('GOOGLE_SERVICE_ACCOUNT not found in .env.local');
  process.exit(1);
}

const storage = new Storage({ credentials });
const bucketName = 'dreamreal-video-editor-uploads';

async function createBucket() {
  try {
    console.log(`Creating bucket: ${bucketName}...`);

    const [bucket] = await storage.createBucket(bucketName, {
      location: 'US',
      storageClass: 'STANDARD',
      lifecycle: {
        rule: [
          {
            action: { type: 'Delete' },
            condition: { age: 7 }, // Auto-delete temporary files older than 7 days
          },
        ],
      },
    });

    console.log(`✅ Bucket ${bucket.name} created successfully!`);
    console.log(`📍 Location: ${bucket.metadata.location}`);
    console.log(`💾 Storage Class: ${bucket.metadata.storageClass}`);
    console.log(`🗑️  Lifecycle: Auto-delete files older than 7 days`);
    console.log(`\n🔗 Bucket URL: gs://${bucketName}`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`✅ Bucket ${bucketName} already exists`);

      // Get bucket metadata
      const bucket = storage.bucket(bucketName);
      const [metadata] = await bucket.getMetadata();
      console.log(`📍 Location: ${metadata.location}`);
      console.log(`💾 Storage Class: ${metadata.storageClass}`);
      console.log(`\n🔗 Bucket URL: gs://${bucketName}`);
    } else {
      console.error('❌ Error creating bucket:', error.message);
      process.exit(1);
    }
  }
}

createBucket();
