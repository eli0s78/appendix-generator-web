'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';

// Types
export interface BookOverview {
  title: string;
  main_theme: string;
  field: string;
  estimated_publication_year: string;
}

export interface ChapterAnalysis {
  chapter_number: number;
  chapter_title: string;
  main_topics: string[];
  key_concepts: string[];
  future_potential: string;
}

export interface AppendixGroup {
  group_id: string;
  theme: string;
  chapters_covered: number[];
  rationale: string;
  suggested_title: string;
  key_questions: string[];
}

export interface PlanningData {
  book_overview: BookOverview;
  chapter_analysis: ChapterAnalysis[];
  recommended_appendix_groups: AppendixGroup[];
  generation_notes: string;
}

export interface ExtractionInfo {
  pages: number;
  estimatedWords: number;
  estimatedChars: number;
  bibliographyRemoved: boolean;
  indexRemoved: boolean;
  wasTruncated: boolean;
  keptPercentage: number;
}

export interface ProjectData {
  version: string;
  savedAt: string;
  apiKey: string | null;
  fileName: string | null;
  bookContent: string | null;
  extractionInfo: ExtractionInfo | null;
  planningData: PlanningData | null;
  generatedAppendices: Record<string, string>;
  forecastYears: number;
  wordCountOption: string;
  currentStep: number;
}

export interface AppState {
  // Step tracking
  currentStep: number;
  setCurrentStep: (step: number) => void;

  // API Key
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  apiKeyValid: boolean;
  setApiKeyValid: (valid: boolean) => void;
  detectedTier: 'free' | 'paid' | null;
  setDetectedTier: (tier: 'free' | 'paid' | null) => void;

  // Book content
  bookContent: string | null;
  setBookContent: (content: string | null) => void;
  extractionInfo: ExtractionInfo | null;
  setExtractionInfo: (info: ExtractionInfo | null) => void;
  fileName: string | null;
  setFileName: (name: string | null) => void;

  // Analysis
  planningData: PlanningData | null;
  setPlanningData: (data: PlanningData | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;

  // Generation
  generatedAppendices: Record<string, string>;
  setGeneratedAppendices: (appendices: Record<string, string>) => void;
  addGeneratedAppendix: (groupId: string, content: string) => void;

  // Settings
  forecastYears: number;
  setForecastYears: (years: number) => void;
  wordCountOption: string;
  setWordCountOption: (option: string) => void;

  // Utility
  resetAll: () => void;
  canProceedToStep: (step: number) => boolean;

  // Project management
  hasProjectData: () => boolean;
  hasUnsavedChanges: () => boolean;
  markAsSaved: () => void;
  getProjectData: () => ProjectData;
  loadProjectData: (data: ProjectData) => void;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);

  // API Key
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyValid, setApiKeyValid] = useState(false);
  const [detectedTier, setDetectedTier] = useState<'free' | 'paid' | null>(null);

  // Book content
  const [bookContent, setBookContent] = useState<string | null>(null);
  const [extractionInfo, setExtractionInfo] = useState<ExtractionInfo | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Analysis
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Generation
  const [generatedAppendices, setGeneratedAppendices] = useState<Record<string, string>>({});

  // Settings
  const [forecastYears, setForecastYears] = useState(15);
  const [wordCountOption, setWordCountOption] = useState('2500-3500');

  // Track saved state for unsaved changes detection
  const lastSavedStateRef = useRef<string | null>(null);

  const addGeneratedAppendix = useCallback((groupId: string, content: string) => {
    setGeneratedAppendices(prev => ({
      ...prev,
      [groupId]: content
    }));
  }, []);

  const resetAll = useCallback(() => {
    setCurrentStep(1);
    setApiKey(null);
    setApiKeyValid(false);
    setDetectedTier(null);
    setBookContent(null);
    setExtractionInfo(null);
    setFileName(null);
    setPlanningData(null);
    setIsAnalyzing(false);
    setGeneratedAppendices({});
    setForecastYears(15);
    setWordCountOption('2500-3500');
    lastSavedStateRef.current = null;
  }, []);

  const canProceedToStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return apiKeyValid;
      case 3:
        return apiKeyValid && bookContent !== null;
      case 4:
        return apiKeyValid && bookContent !== null && planningData !== null;
      default:
        return false;
    }
  }, [apiKeyValid, bookContent, planningData]);

  // Check if there's any project data worth saving
  const hasProjectData = useCallback((): boolean => {
    return (
      apiKeyValid ||
      bookContent !== null ||
      planningData !== null ||
      Object.keys(generatedAppendices).length > 0
    );
  }, [apiKeyValid, bookContent, planningData, generatedAppendices]);

  // Get current state snapshot for comparison
  const getStateSnapshot = useCallback((): string => {
    return JSON.stringify({
      fileName,
      bookContent: bookContent?.substring(0, 100), // Just use first 100 chars for comparison
      planningData,
      generatedAppendices,
      forecastYears,
      wordCountOption,
    });
  }, [fileName, bookContent, planningData, generatedAppendices, forecastYears, wordCountOption]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!hasProjectData()) return false;
    if (lastSavedStateRef.current === null) return true;
    return getStateSnapshot() !== lastSavedStateRef.current;
  }, [hasProjectData, getStateSnapshot]);

  // Mark current state as saved
  const markAsSaved = useCallback(() => {
    lastSavedStateRef.current = getStateSnapshot();
  }, [getStateSnapshot]);

  // Get project data for saving
  const getProjectData = useCallback((): ProjectData => {
    return {
      version: '1.0',
      savedAt: new Date().toISOString(),
      apiKey,
      fileName,
      bookContent,
      extractionInfo,
      planningData,
      generatedAppendices,
      forecastYears,
      wordCountOption,
      currentStep,
    };
  }, [apiKey, fileName, bookContent, extractionInfo, planningData, generatedAppendices, forecastYears, wordCountOption, currentStep]);

  // Load project data
  const loadProjectData = useCallback((data: ProjectData) => {
    // Restore API key if saved
    if (data.apiKey) {
      setApiKey(data.apiKey);
      // Note: apiKeyValid will need to be re-validated by the user
      // The key is pre-filled so they just need to click Validate
    }
    setFileName(data.fileName);
    setBookContent(data.bookContent);
    setExtractionInfo(data.extractionInfo);
    setPlanningData(data.planningData);
    setGeneratedAppendices(data.generatedAppendices || {});
    setForecastYears(data.forecastYears || 15);
    setWordCountOption(data.wordCountOption || '2500-3500');
    // Go to step 1 to validate API key first, then user can navigate
    setCurrentStep(1);
    // Mark as saved since we just loaded
    setTimeout(() => {
      lastSavedStateRef.current = JSON.stringify({
        fileName: data.fileName,
        bookContent: data.bookContent?.substring(0, 100),
        planningData: data.planningData,
        generatedAppendices: data.generatedAppendices || {},
        forecastYears: data.forecastYears || 15,
        wordCountOption: data.wordCountOption || '2500-3500',
      });
    }, 0);
  }, []);

  const value: AppState = {
    currentStep,
    setCurrentStep,
    apiKey,
    setApiKey,
    apiKeyValid,
    setApiKeyValid,
    detectedTier,
    setDetectedTier,
    bookContent,
    setBookContent,
    extractionInfo,
    setExtractionInfo,
    fileName,
    setFileName,
    planningData,
    setPlanningData,
    isAnalyzing,
    setIsAnalyzing,
    generatedAppendices,
    setGeneratedAppendices,
    addGeneratedAppendix,
    forecastYears,
    setForecastYears,
    wordCountOption,
    setWordCountOption,
    resetAll,
    canProceedToStep,
    hasProjectData,
    hasUnsavedChanges,
    markAsSaved,
    getProjectData,
    loadProjectData,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
