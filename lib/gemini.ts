import { GoogleGenerativeAI, Part } from '@google/generative-ai';

export function makeGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  return new GoogleGenerativeAI(apiKey);
}

export async function chat(params: {
  model: string;
  message: string;
  history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  files?: Array<{ data: string; mimeType: string }>;
}) {
  const genAI = makeGenAI();
  const model = genAI.getGenerativeModel({ model: params.model });

  const parts: Part[] = [
    { text: params.message },
  ];

  if (params.files && params.files.length > 0) {
    for (const file of params.files) {
      parts.push({
        inlineData: {
          data: file.data,
          mimeType: file.mimeType,
        },
      });
    }
  }

  const chatSession = model.startChat({
    history: params.history || [],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
    },
  });

  const result = await chatSession.sendMessage(parts);
  return result.response.text();
}
