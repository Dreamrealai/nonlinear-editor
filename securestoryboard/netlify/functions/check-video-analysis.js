// Netlify function: check-video-analysis.js
// Polls a Video Intelligence API operation and returns progress or final analysis

const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');
const { getCorsHeaders } = require('../../lib/cors');

const { mapAnnotationResults } = require('./utils/videoMapper'); // we'll create simple util to avoid duplicate code

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
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '{}' };

  try {
    const { operationName, originalFileName } = JSON.parse(event.body || '{}');
    if (!operationName) throw new Error('Missing operationName');
    if (operationName.startsWith('MOCK-')) {
      // Instant mock complete
      return { statusCode: 200, headers, body: JSON.stringify({ status: 'DONE', progress: 100, analysis: { summary: 'Mock analysis', products:'', hook:'', dialogue:'', music:'', visualStyle:'' } }) };
    }

    const viClient = new VideoIntelligenceServiceClient({ credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) });
    const [op] = await viClient.operationsClient.getOperation({ name: operationName });

    const progress = op.metadata?.progressPercent ?? 0;
    if (!op.done) {
      return { statusCode: 200, headers, body: JSON.stringify({ status: 'RUNNING', progress }) };
    }

    const annotationResults = op.response.annotationResults[0];
    const analysis = mapAnnotationResults(annotationResults, originalFileName || 'video');
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'DONE', progress: 100, analysis }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ status: 'ERROR', message: err.message }) };
  }
}; 