// Ad Analyzer API integration

// API endpoints (update these based on your Netlify deployment)
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8888/.netlify/functions' : '/.netlify/functions';

// Search for client ads
async function searchClientAds(clientName) {
    try {
        const response = await fetch(`${API_BASE}/search-client-ads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clientName })
        });

        if (!response.ok) {
            throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.videos;
    } catch (error) {
        console.error('Error searching for client ads:', error);
        throw error;
    }
}

// Analyze videos
async function analyzeVideos(videoUrls, videoFiles) {
    try {
        const response = await fetch(`${API_BASE}/analyze-video`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ videoUrls, videoFiles })
        });

        if (!response.ok) {
            throw new Error(`Analysis failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Error analyzing videos:', error);
        throw error;
    }
}

// Generate summaries
async function generateSummaries(analyses) {
    try {
        const response = await fetch(`${API_BASE}/generate-summaries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ analyses })
        });

        if (!response.ok) {
            throw new Error(`Summary generation failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.summaries;
    } catch (error) {
        console.error('Error generating summaries:', error);
        throw error;
    }
}

// Main analysis workflow
async function runFullAnalysis(inputData, updateProgressCallback) {
    try {
        let videoUrls = [];
        let videoFiles = [];

        // Step 1: Handle client name search
        if (inputData.type === 'clientName') {
            updateProgressCallback(20, 'Searching for client ads...');
            const videos = await searchClientAds(inputData.value);
            videoUrls = videos.map(v => v.url).filter(url => url && url !== 'not_found');
            
            if (videoUrls.length === 0) {
                throw new Error('No videos found for this client');
            }
        } else if (inputData.type === 'youtubeLinks') {
            videoUrls = inputData.values;
        } else if (inputData.type === 'videoUploads') {
            videoFiles = inputData.files;
        }

        // Step 2: Analyze videos
        updateProgressCallback(40, 'Analyzing videos with AI...');
        const analysisResults = await analyzeVideos(videoUrls, videoFiles);

        // Step 3: Process analysis results
        updateProgressCallback(60, 'Processing analysis results...');
        const formattedAnalyses = analysisResults.map(result => {
            if (result.error) {
                return {
                    title: result.source || 'Unknown video',
                    error: result.error,
                    products: 'Error during analysis',
                    hook: 'Error during analysis',
                    summary: 'Error during analysis',
                    dialogue: 'Error during analysis',
                    music: 'Error during analysis',
                    visualStyle: 'Error during analysis'
                };
            }
            const analysis = result.analysis || {}; // This is now the output of mapAnnotationResults or mock
            return {
                title: analysis.originalFileName || result.source, // Use originalFileName if available
                products: analysis.products || 'Not specified',
                hook: analysis.hook || 'Not specified',
                summary: analysis.summary || 'Not specified',
                dialogue: Array.isArray(analysis.dialogue) ? analysis.dialogue.join('; ') : (analysis.dialogue || 'Not specified'),
                music: analysis.music || 'Not specified',
                visualStyle: analysis.visualStyle || 'Not specified',
                labels: analysis.labels || [],
                shots: analysis.shots || [],
                explicitContent: analysis.explicitContent || 'N/A'
            };
        });

        // Step 4: Generate summaries
        updateProgressCallback(80, 'Generating insights with AI...');
        const summaries = await generateSummaries(formattedAnalyses);

        // Step 5: Complete
        updateProgressCallback(100, 'Analysis complete!');

        return {
            analyses: formattedAnalyses,
            summaries: summaries
        };

    } catch (error) {
        console.error('Full analysis error:', error);
        throw error;
    }
}

// Start video analysis (async job)
async function startVideoAnalysis(payload) {
    const response = await fetch(`${API_BASE}/start-video-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to start analysis');
    return await response.json(); // { operations: [ {source, operationName} ] }
}

// Check operation status
async function checkVideoAnalysis(opName) {
    const response = await fetch(`${API_BASE}/check-video-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName: opName })
    });
    if (!response.ok) throw new Error('Failed to poll analysis');
    return await response.json(); // {status:'RUNNING'|"DONE", progress, analysis?}
}

// Export functions for use in ad-analyze.html
window.AdAnalyzerAPI = {
    searchClientAds,
    analyzeVideos,
    generateSummaries,
    runFullAnalysis,
    startVideoAnalysis,
    checkVideoAnalysis
}; 