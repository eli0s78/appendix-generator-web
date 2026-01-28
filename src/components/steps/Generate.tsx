'use client';

import { useState } from 'react';
import { useAppState, ChapterGroup } from '@/hooks/useAppState';
import { callGemini, getWorkingModel } from '@/lib/gemini-client';
import { getGenerationPrompt } from '@/lib/prompts';
import { exportToMarkdown, exportToDocx, exportAllAsZip } from '@/lib/export';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Wand2,
  Download,
  FileText,
  FileType,
  Archive,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export function Generate() {
  const {
    apiKey,
    detectedTier,
    bookContent,
    planningData,
    generatedAppendices,
    addGeneratedAppendix,
    wordCountOption,
    forecastYears,
  } = useAppState();

  const [activeTab, setActiveTab] = useState<string>(
    planningData?.chapters?.[0]?.group_id || ''
  );
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (group: ChapterGroup) => {
    if (!apiKey || !bookContent || !planningData) return;

    setIsGenerating(group.group_id);
    setError(null);

    try {
      const model = getWorkingModel(detectedTier);

      // Build chapter info from the group's data
      const chapterInfo = `Group ID: ${group.group_id}
Type: ${group.group_type}
Chapters: ${group.chapter_numbers?.join(', ')}
Titles: ${group.chapter_titles?.join(', ')}

Summary:
${group.content_summary}

Thematic Quadrants:
${group.thematic_quadrants?.join('\n- ') || 'Not specified'}

Foresight Task:
${group.foresight_task}`;

      // Build a title from the group data
      const groupTitle = group.chapter_titles?.length === 1
        ? group.chapter_titles[0]
        : `Chapters ${group.chapter_numbers?.join(', ')}`;

      const prompt = getGenerationPrompt(
        `${group.group_id}: ${groupTitle}`,
        chapterInfo,
        bookContent,
        wordCountOption,
        forecastYears
      );

      const response = await callGemini(apiKey, prompt, model);
      addGeneratedAppendix(group.group_id, response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDownloadMarkdown = (groupId: string) => {
    const content = generatedAppendices[groupId];
    if (content) {
      const group = planningData?.chapters?.find((g) => g.group_id === groupId);
      const title = group?.chapter_titles?.join('_') || groupId;
      exportToMarkdown(content, `Appendix_${groupId}_${title}`);
    }
  };

  const handleDownloadDocx = async (groupId: string) => {
    const content = generatedAppendices[groupId];
    if (content) {
      const group = planningData?.chapters?.find((g) => g.group_id === groupId);
      const title = group?.chapter_titles?.join('_') || groupId;
      await exportToDocx(content, `Appendix_${groupId}_${title}`);
    }
  };

  const handleDownloadAll = async () => {
    if (Object.keys(generatedAppendices).length > 0 && planningData) {
      await exportAllAsZip(generatedAppendices, planningData.book_overview.title);
    }
  };

  const generatedCount = Object.keys(generatedAppendices).length;
  const totalCount = planningData?.chapters?.length || 0;

  if (!planningData) {
    return (
      <Alert>
        <AlertDescription>
          Please complete the analysis step first.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loading Overlay */}
      <LoadingOverlay
        isOpen={isGenerating !== null}
        message="Generating Appendix"
        subMessage={`Creating foresight analysis for ${isGenerating}...`}
      />

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Generate Appendices
            </span>
            <Badge variant={generatedCount === totalCount ? 'default' : 'secondary'}>
              {generatedCount} / {totalCount} Generated
            </Badge>
          </CardTitle>
          <CardDescription>
            Generate future-oriented appendices based on your planning table (targeting {new Date().getFullYear() + forecastYears})
          </CardDescription>
        </CardHeader>
        {generatedCount > 0 && (
          <CardContent>
            <Button onClick={handleDownloadAll} variant="outline" className="w-full">
              <Archive className="w-4 h-4 mr-2" />
              Download All ({generatedCount} appendices) as ZIP
            </Button>
          </CardContent>
        )}
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs for each appendix */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1">
          {planningData.chapters?.map((group: ChapterGroup) => (
            <TabsTrigger
              key={group.group_id}
              value={group.group_id}
              className="relative data-[state=active]:bg-background"
            >
              {group.group_id}
              {generatedAppendices[group.group_id] && (
                <CheckCircle2 className="w-3 h-3 ml-1 text-green-500" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {planningData.chapters?.map((group: ChapterGroup) => (
          <TabsContent key={group.group_id} value={group.group_id} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {group.chapter_titles?.join(' & ') || `Chapters ${group.chapter_numbers?.join(', ')}`}
                </CardTitle>
                <CardDescription>{group.content_summary}</CardDescription>
                <div className="flex gap-1 flex-wrap mt-2">
                  {group.chapter_numbers?.map((ch: number) => (
                    <Badge key={ch} variant="outline" className="text-xs">
                      Chapter {ch}
                    </Badge>
                  ))}
                  <Badge variant={group.group_type === 'GROUP' ? 'default' : 'secondary'} className="text-xs">
                    {group.group_type}
                  </Badge>
                </div>
                {group.thematic_quadrants && group.thematic_quadrants.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {group.thematic_quadrants.map((q: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs bg-purple-50">
                        {q}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {!generatedAppendices[group.group_id] ? (
                  <Button
                    onClick={() => handleGenerate(group)}
                    disabled={isGenerating !== null}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating === group.group_id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating appendix...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate This Appendix
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    {/* Generated Content Preview */}
                    <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {generatedAppendices[group.group_id]}
                      </pre>
                    </div>

                    <Separator />

                    {/* Download Options */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => handleDownloadMarkdown(group.group_id)}
                        variant="outline"
                        size="sm"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Download Markdown
                      </Button>
                      <Button
                        onClick={() => handleDownloadDocx(group.group_id)}
                        variant="outline"
                        size="sm"
                      >
                        <FileType className="w-4 h-4 mr-2" />
                        Download Word
                      </Button>
                      <Button
                        onClick={() => handleGenerate(group)}
                        variant="ghost"
                        size="sm"
                        disabled={isGenerating !== null}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
