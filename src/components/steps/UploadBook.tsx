'use client';

import { useState, useCallback } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { extractTextFromPdf, ExtractionProgress } from '@/lib/pdf-extractor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export function UploadBook() {
  const {
    setBookContent,
    setExtractionInfo,
    setFileName,
    bookContent,
    extractionInfo,
    fileName,
    setCurrentStep,
  } = useAppState();

  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file');
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 100) {
      setError(`File is too large (${fileSizeMB.toFixed(1)} MB). Please use PDFs under 100MB.`);
      return;
    }

    setIsExtracting(true);
    setError(null);
    setProgress({ current: 0, total: 100, status: 'Starting...' });

    try {
      const result = await extractTextFromPdf(file, (p) => setProgress(p));

      setBookContent(result.text);
      setExtractionInfo({
        pages: result.info.pages,
        estimatedWords: result.info.estimatedWords,
        estimatedChars: result.info.estimatedChars,
        bibliographyRemoved: result.info.bibliographyRemoved,
        indexRemoved: result.info.indexRemoved,
        wasTruncated: result.info.wasTruncated,
        keptPercentage: result.info.keptPercentage,
      });
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract text from PDF');
    } finally {
      setIsExtracting(false);
      setProgress(null);
    }
  }, [setBookContent, setExtractionInfo, setFileName]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleContinue = () => {
    if (bookContent) {
      setCurrentStep(3);
    }
  };

  const handleReset = () => {
    setBookContent(null);
    setExtractionInfo(null);
    setFileName(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Upload Your Book
          </CardTitle>
          <CardDescription>
            Upload a PDF of your academic book. Text will be extracted in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!bookContent ? (
            <>
              <div
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center transition-colors
                  ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                  ${isExtracting ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                `}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileInput}
                  disabled={isExtracting}
                />

                {isExtracting ? (
                  <div className="space-y-4">
                    <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
                    <p className="text-sm text-muted-foreground">{progress?.status}</p>
                    {progress && (
                      <Progress
                        value={(progress.current / progress.total) * 100}
                        className="w-64 mx-auto"
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700">
                      Drag and drop your PDF here
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      or click to browse (max 100MB)
                    </p>
                  </>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <>
              <Alert className="border-green-500 bg-green-50 text-green-800">
                <CheckCircle2 className="w-4 h-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Extraction Complete: {fileName}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary">{extractionInfo?.pages} pages</Badge>
                      <Badge variant="secondary">
                        {extractionInfo?.estimatedWords?.toLocaleString()} words
                      </Badge>
                      <Badge variant="secondary">
                        {extractionInfo?.estimatedChars?.toLocaleString()} chars
                      </Badge>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {extractionInfo?.bibliographyRemoved && (
                <Alert>
                  <AlertDescription>
                    Bibliography/References section removed (not needed for appendix generation)
                  </AlertDescription>
                </Alert>
              )}

              {extractionInfo?.indexRemoved && (
                <Alert>
                  <AlertDescription>
                    Index section removed (not needed for appendix generation)
                  </AlertDescription>
                </Alert>
              )}

              {extractionInfo?.wasTruncated && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Book was large. Kept {extractionInfo.keptPercentage}% (beginning + end).
                    Some middle content was omitted.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button onClick={handleContinue} className="flex-1" size="lg">
                  Continue to Analyze
                </Button>
                <Button onClick={handleReset} variant="outline">
                  Upload Different Book
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
