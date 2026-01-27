'use client';

import { useState } from 'react';
import { useAppState, PlanningData, AppendixGroup } from '@/hooks/useAppState';
import { callGemini, parseJsonResponse, getWorkingModel } from '@/lib/gemini-client';
import { getAnalysisPrompt } from '@/lib/prompts';
import { exportPlanningTableToMarkdown } from '@/lib/export';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Brain,
  BookOpen,
  Download,
  RefreshCw,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export function AnalyzeReview() {
  const {
    apiKey,
    detectedTier,
    bookContent,
    planningData,
    setPlanningData,
    isAnalyzing,
    setIsAnalyzing,
    setCurrentStep,
    forecastYears,
    setForecastYears,
    wordCountOption,
    setWordCountOption,
  } = useAppState();

  const [error, setError] = useState<string | null>(null);
  const [changeRequest, setChangeRequest] = useState('');
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);

  const handleAnalyze = async () => {
    if (!apiKey || !bookContent) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const model = getWorkingModel(detectedTier);
      const prompt = getAnalysisPrompt(bookContent);
      const response = await callGemini(apiKey, prompt, model);
      const data = parseJsonResponse(response) as PlanningData;
      setPlanningData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyChanges = async () => {
    if (!apiKey || !planningData || !changeRequest.trim()) return;

    setIsApplyingChanges(true);
    setError(null);

    try {
      const model = getWorkingModel(detectedTier);
      const prompt = `You are an expert at modifying planning tables for academic appendices.

Current planning table:
${JSON.stringify(planningData, null, 2)}

User's requested changes:
${changeRequest}

Apply the requested changes and return the UPDATED planning table as a JSON object with the same structure.
Return ONLY the JSON object, no additional text.`;

      const response = await callGemini(apiKey, prompt, model);
      const updatedData = parseJsonResponse(response) as PlanningData;
      setPlanningData(updatedData);
      setChangeRequest('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply changes');
    } finally {
      setIsApplyingChanges(false);
    }
  };

  const handleContinue = () => {
    if (planningData) {
      setCurrentStep(4);
    }
  };

  const handleExportPlanningTable = () => {
    if (planningData) {
      exportPlanningTableToMarkdown(planningData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Card - only show before analysis */}
      {!planningData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generation Settings</CardTitle>
            <CardDescription>Configure how appendices will be generated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="forecast-years">Forecast Years</Label>
                <Input
                  id="forecast-years"
                  type="number"
                  min={5}
                  max={30}
                  value={forecastYears}
                  onChange={(e) => setForecastYears(parseInt(e.target.value) || 15)}
                />
                <p className="text-xs text-muted-foreground">
                  How many years into the future to forecast (default: 15)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="word-count">Word Count per Appendix</Label>
                <select
                  id="word-count"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={wordCountOption}
                  onChange={(e) => setWordCountOption(e.target.value)}
                >
                  <option value="1500-2000">Short (1500-2000 words)</option>
                  <option value="2500-3500">Standard (2500-3500 words)</option>
                  <option value="4000-5000">Long (4000-5000 words)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            {planningData ? 'Planning Table' : 'Analyze Book'}
          </CardTitle>
          <CardDescription>
            {planningData
              ? 'Review and customize the analysis before generating appendices'
              : 'AI will analyze your book and create a planning table for appendix generation'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!planningData ? (
            <>
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                size="lg"
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing book structure...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Analysis
                  </>
                )}
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <>
              {/* Book Overview */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {planningData.book_overview.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {planningData.book_overview.main_theme}
                </p>
                <div className="flex gap-2">
                  <Badge variant="secondary">{planningData.book_overview.field}</Badge>
                  {planningData.book_overview.estimated_publication_year !== 'Unknown' && (
                    <Badge variant="outline">
                      {planningData.book_overview.estimated_publication_year}
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Recommended Appendices */}
              <div>
                <h3 className="font-semibold mb-3">Recommended Appendices</h3>
                <Accordion type="multiple" className="space-y-2">
                  {planningData.recommended_appendix_groups.map((group: AppendixGroup) => (
                    <AccordionItem
                      key={group.group_id}
                      value={group.group_id}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <Badge variant="default">{group.group_id}</Badge>
                          <span className="font-medium">{group.theme}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Suggested Title
                          </p>
                          <p className="text-sm">{group.suggested_title}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Chapters Covered
                          </p>
                          <div className="flex gap-1 flex-wrap">
                            {group.chapters_covered.map((ch: number) => (
                              <Badge key={ch} variant="outline" className="text-xs">
                                Ch. {ch}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Rationale</p>
                          <p className="text-sm">{group.rationale}</p>
                        </div>
                        {group.key_questions && group.key_questions.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Key Questions
                            </p>
                            <ul className="text-sm list-disc list-inside">
                              {group.key_questions.map((q: string, i: number) => (
                                <li key={i}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              <Separator />

              {/* AI-Assisted Changes */}
              <div className="space-y-3">
                <h3 className="font-semibold">Request Changes</h3>
                <Textarea
                  placeholder="Describe any changes you'd like to make to the planning table...&#10;&#10;Examples:&#10;- Merge appendices A1 and A2&#10;- Add a new appendix about ethics&#10;- Change the title of A3"
                  value={changeRequest}
                  onChange={(e) => setChangeRequest(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={handleApplyChanges}
                  disabled={isApplyingChanges || !changeRequest.trim()}
                  variant="secondary"
                >
                  {isApplyingChanges ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Applying changes...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Apply Changes
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleContinue} className="flex-1" size="lg">
                  Continue to Generate
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <Button onClick={handleExportPlanningTable} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button onClick={handleAnalyze} variant="outline" disabled={isAnalyzing}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-analyze
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
