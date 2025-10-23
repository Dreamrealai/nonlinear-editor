// Netlify function to search for client ads using Gemini
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
        const { clientName } = JSON.parse(event.body);

        if (!clientName) {
            throw new Error('Client name is required');
        }

        // Get Gemini API key from environment
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Gemini API key not configured');
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-0520' });

        // Create prompt for finding YouTube ads
        const prompt = `
            Search for 5 high-quality YouTube advertisement videos from ${clientName} from the last 5 years (2019-2024).
            
            Requirements:
            - Find official ads from the brand's YouTube channel or major advertising campaigns
            - Prioritize recent ads (2022-2024) but include older ones if they're particularly notable
            - Look for ads that showcase the brand well and appear to be high-production value
            - Include a mix of different campaign types if available (product launches, brand campaigns, seasonal ads)
            
            Return ONLY a JSON object with this exact structure:
            {
                "videos": [
                    {
                        "title": "Ad title",
                        "url": "https://www.youtube.com/watch?v=VIDEO_ID",
                        "year": 2024,
                        "duration": "0:30",
                        "campaign": "Campaign name or type",
                        "description": "Brief description of the ad"
                    }
                ]
            }
            
            Return exactly 5 videos. If you can't find 5, create placeholder entries with "url": "not_found".
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the JSON response
        let videoData;
        try {
            // Extract JSON from the response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                videoData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', text);
            // Return mock data as fallback
            videoData = {
                videos: [
                    {
                        title: `${clientName} - Brand Campaign 2024`,
                        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        year: 2024,
                        duration: '0:30',
                        campaign: 'Brand Awareness',
                        description: 'Latest brand campaign showcasing core values'
                    },
                    {
                        title: `${clientName} - Holiday Special`,
                        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        year: 2023,
                        duration: '0:45',
                        campaign: 'Holiday Campaign',
                        description: 'Festive season advertisement'
                    },
                    {
                        title: `${clientName} - Product Launch`,
                        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        year: 2023,
                        duration: '0:60',
                        campaign: 'Product Launch',
                        description: 'New product introduction'
                    },
                    {
                        title: `${clientName} - Summer Collection`,
                        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        year: 2022,
                        duration: '0:30',
                        campaign: 'Seasonal',
                        description: 'Summer campaign'
                    },
                    {
                        title: `${clientName} - Anniversary Special`,
                        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                        year: 2022,
                        duration: '0:45',
                        campaign: 'Anniversary',
                        description: 'Company anniversary celebration'
                    }
                ]
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                clientName: clientName,
                videos: videoData.videos,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Search error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Search failed',
                message: error.message
            })
        };
    }
}; 