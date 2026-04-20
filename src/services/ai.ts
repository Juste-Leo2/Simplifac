import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export type AIProvider = 'google' | 'groq';

const PROVIDER_CONFIG = {
  google: { model: 'gemma-4-26b-a4b-it' },
  groq: { model: 'openai/gpt-oss-20b', baseURL: 'https://api.groq.com/openai/v1' },
} as const;

/**
 * Sends a test prompt to validate the API key.
 * Returns true if the key works, false otherwise.
 */
export async function testApiKey(provider: AIProvider, apiKey: string): Promise<boolean> {
  try {
    const response = await generateAIResponse(provider, apiKey, 'Réponds juste "ok".');
    return response.length > 0;
  } catch {
    return false;
  }
}

/**
 * Generates a response from the specified AI provider.
 */
export async function generateAIResponse(
  provider: AIProvider,
  apiKey: string,
  message: string,
): Promise<string> {
  if (!apiKey) {
    throw new Error('Clé API manquante.');
  }

  if (provider === 'google') {
    return googleGenerate(apiKey, message);
  }
  return groqGenerate(apiKey, message);
}

async function googleGenerate(apiKey: string, message: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: PROVIDER_CONFIG.google.model,
    contents: message,
  });
  return response.text ?? '';
}

async function groqGenerate(apiKey: string, message: string): Promise<string> {
  const client = new OpenAI({
    apiKey,
    baseURL: PROVIDER_CONFIG.groq.baseURL,
  });
  const response = await client.responses.create({
    model: PROVIDER_CONFIG.groq.model,
    input: message,
  });
  return response.output_text ?? '';
}
