// Netlify function to generate summaries using Gemini
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
        const { analyses } = JSON.parse(event.body);

        if (!analyses || analyses.length === 0) {
            throw new Error('No analyses provided');
        }

        // Get Gemini API key from environment
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Gemini API key not configured');
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-0520' });

        // Format analyses for the prompt
        const analysesText = analyses.map((analysis, index) => {
            return `
Video ${index + 1}: ${analysis.title || 'Unknown'}
- Products & Offer: ${analysis.products || 'N/A'}
- Key Hook: ${analysis.hook || 'N/A'}
- Summary & Key Scenes: ${analysis.summary || 'N/A'}
- Dialogue/Words: ${analysis.dialogue || 'N/A'}
- Music: ${analysis.music || 'N/A'}
- Visual Style: ${analysis.visualStyle || 'N/A'}
            `;
        }).join('\n\n');

        // Generate learnings summary
        const learningsPrompt = `
Based on these ${analyses.length} advertisement video analyses, provide a comprehensive summary of key learnings about the advertising approach, patterns, and strategies used.

${analysesText}

Focus on:
1. Common patterns in hooks and storytelling
2. Product presentation strategies
3. Pacing and structure patterns
4. Emotional appeals and messaging
5. Call-to-action approaches

Write a cohesive paragraph (150-200 words) summarizing the key learnings.
        `;

        const learningsResult = await model.generateContent(learningsPrompt);
        const learningsResponse = await learningsResult.response;
        const learningsSummary = learningsResponse.text();

        // Generate visual style summary
        const visualStylePrompt = `
Based on these ${analyses.length} advertisement video analyses, provide a comprehensive summary of the brand's visual style and aesthetic choices.

${analysesText}

Focus on:
1. Color grading and color palette patterns
2. Camera work and movement styles
3. Editing pace and transitions
4. Visual effects and overlays
5. Typography and graphic elements
6. Overall aesthetic consistency

Write a cohesive paragraph (150-200 words) describing the brand's visual style identity.
        `;

        const visualStyleResult = await model.generateContent(visualStylePrompt);
        const visualStyleResponse = await visualStyleResult.response;
        const visualStyleSummary = visualStyleResponse.text();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                summaries: {
                    learnings: learningsSummary.trim(),
                    visualStyle: visualStyleSummary.trim()
                },
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Summary generation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Summary generation failed',
                message: error.message
            })
        };
    }
}; 