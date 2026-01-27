import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface RequestBody {
  apiKey: string;
  prompt?: string;
  model?: string;
  action: 'generate' | 'validate' | 'detectTier';
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { apiKey, prompt, model, action } = body;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    // Create Gemini client
    const genAI = new GoogleGenerativeAI(apiKey);

    switch (action) {
      case 'validate': {
        // Validate API key by making a simple request
        try {
          const validationModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const result = await validationModel.generateContent('OK');
          const text = result.response.text();

          if (text) {
            // Key is valid, now detect tier
            const tier = await detectApiTier(genAI);
            const modelName = tier === 'paid' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash';
            const tierLabel = tier === 'paid' ? 'Paid' : 'Free';

            return NextResponse.json({
              success: true,
              message: `API key valid! Using: ${modelName} [${tierLabel}]`,
              tier,
            });
          }

          return NextResponse.json({
            success: false,
            error: 'Could not validate API key',
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';

          if (errorMsg.toLowerCase().includes('api_key') || errorMsg.toLowerCase().includes('invalid')) {
            return NextResponse.json({
              success: false,
              error: 'Invalid API key. Please get a new key from Google AI Studio.',
            });
          }

          if (errorMsg.toLowerCase().includes('quota')) {
            return NextResponse.json({
              success: false,
              error: 'API quota exceeded. Please wait or check your usage limits.',
            });
          }

          return NextResponse.json({
            success: false,
            error: `Validation failed: ${errorMsg}`,
          });
        }
      }

      case 'detectTier': {
        const tier = await detectApiTier(genAI);
        return NextResponse.json({ success: true, tier });
      }

      case 'generate': {
        if (!prompt) {
          return NextResponse.json(
            { success: false, error: 'Prompt is required for generation' },
            { status: 400 }
          );
        }

        const modelName = model || 'gemini-2.5-flash';
        const generativeModel = genAI.getGenerativeModel({ model: modelName });

        try {
          const result = await generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 32768,
            },
          });

          const text = result.response.text();

          return NextResponse.json({
            success: true,
            text,
          });
        } catch (error) {
          const errorStr = error instanceof Error ? error.message : 'Unknown error';

          // Check if this is a free tier error on a Pro model
          if (modelName.includes('pro') && isTierError(errorStr)) {
            // Fallback to Flash model
            try {
              const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
              const result = await fallbackModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 32768,
                },
              });

              return NextResponse.json({
                success: true,
                text: result.response.text(),
              });
            } catch (fallbackError) {
              return NextResponse.json({
                success: false,
                error: fallbackError instanceof Error ? fallbackError.message : 'Generation failed',
              });
            }
          }

          return NextResponse.json({
            success: false,
            error: errorStr,
          });
        }
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * Detect API tier by trying Pro model
 */
async function detectApiTier(genAI: GoogleGenerativeAI): Promise<'free' | 'paid'> {
  try {
    const proModel = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    await proModel.generateContent('OK');
    return 'paid';
  } catch (error) {
    const errorStr = error instanceof Error ? error.message : '';

    if (isTierError(errorStr)) {
      return 'free';
    }

    // Other errors - default to free for safety
    return 'free';
  }
}

/**
 * Check if error indicates free tier limitation
 */
function isTierError(errorStr: string): boolean {
  const errorLower = errorStr.toLowerCase();
  return (
    errorLower.includes('free_tier') ||
    errorStr.includes('limit: 0') ||
    errorStr.includes('limit":0') ||
    errorStr.includes('limit": 0') ||
    (errorLower.includes('resource_exhausted') && errorLower.includes('limit')) ||
    (errorLower.includes('quota') && errorLower.includes('pro'))
  );
}
