/**
 * Gemini API Client
 * Calls the serverless function to interact with Google Gemini API
 */

interface GeminiResponse {
  success: boolean;
  text?: string;
  error?: string;
}

interface TierDetectionResponse {
  success: boolean;
  tier?: 'free' | 'paid';
  error?: string;
}

interface ValidationResponse {
  success: boolean;
  message: string;
  tier?: 'free' | 'paid';
}

/**
 * Call Gemini API via our serverless proxy
 * @param signal - Optional AbortSignal for cancellation
 */
export async function callGemini(
  apiKey: string,
  prompt: string,
  model?: string,
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey,
      prompt,
      model,
      action: 'generate',
    }),
    signal,
  });

  const data: GeminiResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to call Gemini API');
  }

  return data.text || '';
}

/**
 * Validate API key and detect tier
 */
export async function validateApiKey(apiKey: string): Promise<ValidationResponse> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey,
      action: 'validate',
    }),
  });

  const data = await response.json();

  if (!data.success) {
    return {
      success: false,
      message: data.error || 'Invalid API key',
    };
  }

  return {
    success: true,
    message: data.message || 'API key valid',
    tier: data.tier,
  };
}

/**
 * Detect API tier (free vs paid)
 */
export async function detectTier(apiKey: string): Promise<'free' | 'paid'> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey,
      action: 'detectTier',
    }),
  });

  const data: TierDetectionResponse = await response.json();

  if (!data.success || !data.tier) {
    return 'free'; // Default to free tier on error
  }

  return data.tier;
}

/**
 * Parse JSON response from Gemini, handling markdown code blocks
 */
export function parseJsonResponse(response: string): unknown {
  // Remove markdown code blocks if present
  let jsonStr = response.trim();

  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }

  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }

  jsonStr = jsonStr.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try to find JSON object in the response
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('Could not parse JSON response from AI');
      }
    }
    throw new Error('Could not find valid JSON in response');
  }
}

/**
 * Get the working model based on tier
 */
export function getWorkingModel(tier: 'free' | 'paid' | null): string {
  if (tier === 'paid') {
    return 'gemini-2.5-pro';
  }
  return 'gemini-2.5-flash';
}
