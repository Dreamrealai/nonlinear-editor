// Netlify function for video analysis
const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');
const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid'); // For unique filenames
const { getCorsHeaders } = require('../../lib/cors');

exports.handler = async (event, context) => {
    // Enable CORS with proper origin validation
    const headers = {
        ...getCorsHeaders(event, {
            allowCredentials: true,
            allowedMethods: 'POST, OPTIONS',
            allowedHeaders: 'Content-Type'
        }),
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }

    // Only accept POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { videoUrls, videoFiles } = JSON.parse(event.body);

        // Get credentials from environment variable
        const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
        if (!credentialsJson) {
            throw new Error('Google Cloud credentials not configured');
        }

        const credentials = JSON.parse(credentialsJson);

        const gcsBucketName = process.env.GCS_BUCKET_NAME;
        if (!gcsBucketName && videoFiles && videoFiles.length > 0) {
            throw new Error('GCS bucket name not configured for file uploads');
        }

        // Initialize Video Intelligence client
        const videoIntelligenceClient = new VideoIntelligenceServiceClient({
            credentials
        });

        const storage = new Storage({ credentials });

        // Prepare analysis results
        const results = [];

        // Process uploaded video files (Base64 encoded)
        if (videoFiles && videoFiles.length > 0) {
            for (const file of videoFiles) {
                if (!file.content || !file.name) {
                    results.push({ source: file.name || 'unknown_file', error: 'Invalid file data' });
                    continue;
                }

                const buffer = Buffer.from(file.content, 'base64');
                const fileName = `uploads/${uuidv4()}-${file.name}`;
                const gcsFile = storage.bucket(gcsBucketName).file(fileName);

                try {
                    await gcsFile.save(buffer, { contentType: file.type || 'video/mp4' });
                    const gcsUri = `gs://${gcsBucketName}/${fileName}`;

                    const request = {
                        inputUri: gcsUri,
                        features: [
                            'LABEL_DETECTION',
                            'SHOT_CHANGE_DETECTION',
                            'TEXT_DETECTION',
                            'EXPLICIT_CONTENT_DETECTION',
                            // 'SPEECH_TRANSCRIPTION' // Consider adding if needed, requires config
                        ],
                        // Optional: Add videoContext for speech_transcription hints
                        // videoContext: {
                        // speechTranscriptionConfig: {
                        // languageCode: 'en-US',
                        // enableAutomaticPunctuation: true,
                        // },
                        // },
                    };

                    const [operation] = await videoIntelligenceClient.annotateVideo(request);
                    console.log(`Waiting for GCS video analysis operation to complete for ${gcsUri}...`);
                    const [operationResult] = await operation.promise();
                    console.log(`GCS video analysis done for ${gcsUri}`);

                    // Basic mapping (can be greatly expanded)
                    const annotationResults = operationResult.annotationResults[0];
                    const analysisOutput = mapAnnotationResults(annotationResults, file.name);
                    results.push({ source: file.name, analysis: analysisOutput });

                    // Optional: Delete file from GCS after analysis
                    // await gcsFile.delete();

                } catch (error) {
                    console.error(`Error processing uploaded file ${file.name}:`, error);
                    results.push({ source: file.name, error: `Failed to process: ${error.message}` });
                }
            }
        }

        // Process YouTube URLs (still using mock for now)
        if (videoUrls && videoUrls.length > 0) {
            for (const url of videoUrls) {
                try {
                    const videoId = extractYouTubeId(url);
                    results.push({
                        source: url,
                        videoId: videoId,
                        analysis: {
                            products: "[Mock Data] Various products shown",
                            hook: "[Mock Data] Engaging storyline with a twist",
                            summary: "[Mock Data] Video summary highlighting key scenes...",
                            dialogue: "[Mock Data] Limited time offer! Buy now!",
                            music: "[Mock Data] Upbeat and catchy tune",
                            visualStyle: "[Mock Data] Bright colors, fast-paced editing",
                            labels: ['advertising', 'commercial', 'product'],
                            shots: [
                                { startTime: '0s', endTime: '5s', description: 'Opening scene' },
                                { startTime: '5s', endTime: '15s', description: 'Product showcase' },
                                { startTime: '15s', endTime: '30s', description: 'Call to action' }
                            ],
                            text: ['Limited time offer', 'Buy now', 'Free shipping'],
                            confidence: 0.85
                        }
                    });
                } catch (error) {
                    console.error(`Error processing ${url}:`, error);
                    results.push({ source: url, error: 'Failed to process YouTube URL (mock path)' });
                }
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                results: results,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Analysis error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Analysis failed',
                message: error.message
            })
        };
    }
};

function mapAnnotationResults(annotationResults, originalFileName) {
    let mapped = {
        originalFileName,
        products: "Analysis for products pending detailed mapping.",
        hook: "Hook detection pending detailed mapping.",
        summary: "Scene summary pending detailed mapping.",
        dialogue: [],
        music: "Music analysis pending more specific features.",
        visualStyle: "Visual style elements pending detailed mapping.",
        labels: [],
        shots: [],
        explicitContent: "No explicit content detected or N/A."
    };

    if (annotationResults.segmentLabelAnnotations) {
        mapped.labels = annotationResults.segmentLabelAnnotations.map(label => {
            return {
                description: label.entity.description,
                category: label.categoryEntities.map(cat => cat.description).join(', '),
                confidence: label.segments.reduce((acc, seg) => Math.max(acc, seg.confidence), 0)
            };
        }).slice(0, 10); // Limit to top 10 labels
    }

    if (annotationResults.shotAnnotations) {
        mapped.shots = annotationResults.shotAnnotations.map(shot => {
            return {
                startTime: shot.startTimeOffset ? shot.startTimeOffset.seconds + (shot.startTimeOffset.nanos / 1e9) + 's' : 'N/A',
                endTime: shot.endTimeOffset ? shot.endTimeOffset.seconds + (shot.endTimeOffset.nanos / 1e9) + 's' : 'N/A',
                description: `Shot from ${mapped.shots.length > 0 ? mapped.shots[mapped.shots.length -1].endTime : 'start'} to ${shot.endTimeOffset ? shot.endTimeOffset.seconds + (shot.endTimeOffset.nanos / 1e9) : 'end'}`
            };
        }).slice(0,10); // Limit to top 10 shots
        mapped.summary = `Video consists of ${mapped.shots.length} key shots. First shot ends at ${mapped.shots[0]?.endTime}. Labels include: ${mapped.labels.map(l=>l.description).join(", ")}`
    }

    if (annotationResults.textAnnotations) {
        mapped.dialogue = annotationResults.textAnnotations.map(text => text.text).filter(Boolean);
    }
    
    // Speech transcription results would be in `speechTranscriptions`
    // const speechTranscription = annotationResults.speechTranscriptions?.[0];
    // if (speechTranscription) {
    //     mapped.dialogue = speechTranscription.alternatives?.[0]?.transcript || "";
    // }

    if (annotationResults.explicitAnnotation) {
        const explicit = annotationResults.explicitAnnotation;
        const frames = explicit.frames.filter(frame => frame.pornographyLikelihood !== 'VERY_UNLIKELY' && frame.pornographyLikelihood !== 'UNLIKELY');
        if (frames.length > 0) {
            mapped.explicitContent = `Potential explicit content detected in ${frames.length} frames. First occurrence around ${frames[0].timeOffset.seconds}s.`;
        }
    }
    
    // Enhanced mapping: Populate products, hook, music, visualStyle from annotations

    // Detect products from labels and text
    const productKeywords = ['product', 'item', 'merchandise', 'goods', 'package', 'box', 'bottle', 'can', 'phone', 'device'];
    const productLabels = mapped.labels
        .filter(label => productKeywords.some(keyword => label.description.toLowerCase().includes(keyword)))
        .map(label => label.description);
    const productText = mapped.dialogue.filter(text =>
        productKeywords.some(keyword => text.toLowerCase().includes(keyword))
    );
    if (productLabels.length > 0 || productText.length > 0) {
        mapped.products = `Detected products: ${[...new Set([...productLabels, ...productText])].join(', ')}`;
    }

    // Detect hook from first shot and opening labels
    if (mapped.shots.length > 0 && mapped.labels.length > 0) {
        const firstShot = mapped.shots[0];
        const openingLabels = mapped.labels.slice(0, 3).map(l => l.description);
        mapped.hook = `Opening scene (${firstShot.endTime}): ${openingLabels.join(', ')}. ${mapped.dialogue.slice(0, 2).join(' ')}`;
    }

    // Detect music style from audio-related labels
    const musicKeywords = ['music', 'song', 'melody', 'rhythm', 'beat', 'soundtrack', 'audio', 'sound'];
    const musicLabels = mapped.labels.filter(label =>
        musicKeywords.some(keyword => label.description.toLowerCase().includes(keyword))
    );
    if (musicLabels.length > 0) {
        mapped.music = `Audio features: ${musicLabels.map(l => l.description).join(', ')}`;
    }

    // Detect visual style from labels and shot pacing
    const styleKeywords = {
        color: ['colorful', 'monochrome', 'vibrant', 'bright', 'dark', 'saturated'],
        pacing: ['fast', 'slow', 'dynamic', 'static'],
        composition: ['close-up', 'wide', 'aerial', 'portrait', 'landscape']
    };

    const colorStyles = mapped.labels
        .filter(l => styleKeywords.color.some(keyword => l.description.toLowerCase().includes(keyword)))
        .map(l => l.description);
    const compositionStyles = mapped.labels
        .filter(l => styleKeywords.composition.some(keyword => l.description.toLowerCase().includes(keyword)))
        .map(l => l.description);

    // Infer pacing from shot count and durations
    const avgShotDuration = mapped.shots.length > 0
        ? mapped.shots.reduce((sum, shot) => {
            const duration = parseFloat(shot.endTime) - parseFloat(shot.startTime);
            return sum + duration;
          }, 0) / mapped.shots.length
        : 0;
    const pacing = avgShotDuration < 3 ? 'fast-paced editing' : avgShotDuration < 6 ? 'moderate pacing' : 'slow, deliberate pacing';

    const styleElements = [
        ...colorStyles,
        ...compositionStyles,
        pacing,
        `${mapped.shots.length} total shots`
    ].filter(Boolean);

    if (styleElements.length > 0) {
        mapped.visualStyle = styleElements.join(', ');
    }

    return mapped;
}

// Helper function to extract YouTube video ID
function extractYouTubeId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
} 