'use client';

import { useState } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { validateApiKey } from '@/lib/gemini-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Loader2, Key, ExternalLink, CheckCircle2 } from 'lucide-react';

export function ApiSetup() {
  const {
    apiKey,
    setApiKey,
    apiKeyValid,
    setApiKeyValid,
    detectedTier,
    setDetectedTier,
    setCurrentStep,
  } = useAppState();

  const [inputKey, setInputKey] = useState(apiKey || '');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!inputKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setIsValidating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await validateApiKey(inputKey.trim());

      if (result.success) {
        setApiKey(inputKey.trim());
        setApiKeyValid(true);
        setDetectedTier(result.tier || 'free');
        setSuccessMessage(result.message);
      } else {
        setError(result.message);
        setApiKeyValid(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
      setApiKeyValid(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleContinue = () => {
    if (apiKeyValid) {
      setCurrentStep(2);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Connect to Google AI
          </CardTitle>
          <CardDescription>
            Enter your Google AI Studio API key to enable AI-powered analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter your API key (starts with AIza...)"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
              className="flex-1"
            />
            <Button onClick={handleValidate} disabled={isValidating || !inputKey.trim()}>
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                'Validate'
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {apiKeyValid && successMessage && (
            <Alert className="border-green-500 bg-green-50 text-green-800">
              <CheckCircle2 className="w-4 h-4" />
              <AlertDescription className="flex items-center gap-2">
                {successMessage}
                {detectedTier && (
                  <Badge variant={detectedTier === 'paid' ? 'default' : 'secondary'}>
                    {detectedTier === 'paid' ? 'Paid Tier' : 'Free Tier'}
                  </Badge>
                )}
              </AlertDescription>
            </Alert>
          )}

          {apiKeyValid && (
            <Button onClick={handleContinue} className="w-full" size="lg">
              Continue to Upload Book
            </Button>
          )}
        </CardContent>
      </Card>

      <Accordion type="single" collapsible defaultValue="help">
        <AccordionItem value="help">
          <AccordionTrigger>How to get an API key</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Go to{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Google AI Studio
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Sign in with your Google account</li>
              <li>Click &quot;Create API Key&quot;</li>
              <li>Copy the key and paste it above</li>
            </ol>

            <div className="bg-muted p-3 rounded-md text-sm">
              <strong>Free tier:</strong> Limited to Flash models (still excellent for this app)
              <br />
              <strong>Paid tier:</strong> Access to Pro models for enhanced analysis
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
