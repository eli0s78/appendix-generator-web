'use client';

import { useState } from 'react';
import { useAppState, PlanningData, ChapterGroup } from '@/hooks/useAppState';
import { callGemini, parseJsonResponse, getWorkingModel } from '@/lib/gemini-client';
import { getAnalysisPrompt } from '@/lib/prompts';
import { exportPlanningTableToMarkdown, exportPlanningTableToDocx, exportPlanningTableToPdf } from '@/lib/export';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Loader2,
  Brain,
  BookOpen,
  Download,
  RefreshCw,
  ChevronRight,
  Sparkles,
  FileText,
  FileType,
  Printer,
} from 'lucide-react';

export function AnalyzeReview() {
  const {
    apiKey,
    detectedTier,
    bookContent,
    extractionInfo,
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
      const wasTruncated = extractionInfo?.wasTruncated ?? false;
      const prompt = getAnalysisPrompt(bookContent, wasTruncated);
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

  const handleExportMarkdown = () => {
    if (planningData) {
      exportPlanningTableToMarkdown(planningData);
    }
  };

  const handleExportDocx = async () => {
    if (planningData) {
      await exportPlanningTableToDocx(planningData);
    }
  };

  const handleExportPdf = () => {
    if (planningData) {
      exportPlanningTableToPdf(planningData);
    }
  };

  return (
    <div className="space-y-6">
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
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {planningData.book_overview.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {planningData.book_overview.scope}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {planningData.book_overview.total_chapters} Chapters
                  </Badge>
                  {planningData.book_overview.disciplines?.map((d: string, i: number) => (
                    <Badge key={i} variant="outline">{d}</Badge>
                  ))}
                  {planningData.book_overview.languages?.map((l: string, i: number) => (
                    <Badge key={i} variant="outline" className="bg-blue-50">{l}</Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Chapter Groups / Appendices */}
              <div>
                <h3 className="font-semibold mb-3">
                  Foresight Planning Table ({planningData.chapters?.length || 0} groups)
                </h3>
                <Accordion type="multiple" className="space-y-2">
                  {planningData.chapters?.map((group: ChapterGroup) => (
                    <AccordionItem
                      key={group.group_id}
                      value={group.group_id}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <Badge variant={group.group_type === 'GROUP' ? 'default' : 'secondary'}>
                            {group.group_id}
                          </Badge>
                          <span className="font-medium">
                            {group.chapter_titles?.join(', ') || `Chapters ${group.chapter_numbers?.join(', ')}`}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Chapters Covered
                          </p>
                          <div className="flex gap-1 flex-wrap">
                            {group.chapter_numbers?.map((ch: number, i: number) => (
                              <Badge key={ch} variant="outline" className="text-xs">
                                Ch. {ch}: {group.chapter_titles?.[i] || ''}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Summary</p>
                          <p className="text-sm">{group.content_summary}</p>
                        </div>
                        {group.thematic_quadrants && group.thematic_quadrants.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Thematic Quadrants
                            </p>
                            <div className="flex gap-1 flex-wrap mt-1">
                              {group.thematic_quadrants.map((q: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs bg-purple-50">
                                  {q}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Foresight Task
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{group.foresight_task}</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              {/* Implementation Notes */}
              {planningData.implementation_notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Implementation Notes</h3>
                    <p className="text-sm text-muted-foreground">
                      {planningData.implementation_notes}
                    </p>
                  </div>
                </>
              )}

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

              <Separator />

              {/* Generation Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold">Generation Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Forecast Horizon Slider */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Forecast Horizon</Label>
                    <div className="pt-2">
                      <Slider
                        value={[forecastYears]}
                        onValueChange={(value) => setForecastYears(value[0])}
                        min={5}
                        max={30}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                        <span>{forecastYears} years</span>
                        <span>Target: {new Date().getFullYear() + forecastYears}</span>
                      </div>
                    </div>
                  </div>

                  {/* Word Count Radio Buttons */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Target Word Count</Label>
                    <RadioGroup
                      value={wordCountOption}
                      onValueChange={setWordCountOption}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="1500-2000" id="short" />
                        <Label htmlFor="short" className="font-normal cursor-pointer text-sm">
                          Short (1500-2000 words)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="2500-3500" id="standard" />
                        <Label htmlFor="standard" className="font-normal cursor-pointer text-sm">
                          Standard (2500-3500 words)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="4000-5000" id="detailed" />
                        <Label htmlFor="detailed" className="font-normal cursor-pointer text-sm">
                          Detailed (4000-5000 words)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Separator />

              {/* Actions */}
              <div className="space-y-3">
                <Button onClick={handleContinue} className="w-full" size="lg">
                  Continue to Generate
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={handleExportMarkdown} variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Export MD
                  </Button>
                  <Button onClick={handleExportDocx} variant="outline" size="sm">
                    <FileType className="w-4 h-4 mr-2" />
                    Export DOCX
                  </Button>
                  <Button onClick={handleExportPdf} variant="outline" size="sm">
                    <Printer className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button onClick={handleAnalyze} variant="outline" size="sm" disabled={isAnalyzing}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-analyze
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
