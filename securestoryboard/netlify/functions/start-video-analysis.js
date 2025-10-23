// Netlify function: start-video-analysis.js
// Starts Video Intelligence analysis for uploaded files and/or YouTube URLs and returns operation names

const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');
const { getCorsHeaders } = require('../../lib/cors');

const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
  const headers = {
    ...getCorsHeaders(event, {
      allowCredentials: true,
      allowedMethods: 'POST, OPTIONS',
      allowedHeaders: 'Content-Type'
    }),
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { videoUrls = [], videoFiles = [] } = JSON.parse(event.body || '{}');

    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsJson) throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON not set');
    const credentials = JSON.parse(credentialsJson);

    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName && videoFiles.length) throw new Error('GCS_BUCKET_NAME missing');

    const viClient = new VideoIntelligenceServiceClient({ credentials });
    const storage = new Storage({ credentials });

    const operations = [];

    // Handle Base64 uploaded files
    for (const file of videoFiles) {
      if (!file.content || !file.name) continue;
      const buffer = Buffer.from(file.content, 'base64');
      const gcsPath = `uploads/${uuidv4()}-${file.name}`;
      const gcsFile = storage.bucket(bucketName).file(gcsPath);
      await gcsFile.save(buffer, { contentType: file.type || 'video/mp4' });
      const gcsUri = `gs://${bucketName}/${gcsPath}`;

      const [operation] = await viClient.annotateVideo({
        inputUri: gcsUri,
        features: [
          'LABEL_DETECTION',
          'SHOT_CHANGE_DETECTION',
          'TEXT_DETECTION',
          'EXPLICIT_CONTENT_DETECTION'
        ]
      });
      operations.push({ source: file.name, operationName: operation.name });
    }

    // For YouTube URLs we still return mock operations (not analyzed yet)
    videoUrls.forEach((url) => {
      operations.push({ source: url, operationName: 'MOCK-' + url });
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, operations })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
}; 