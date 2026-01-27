'use client';

import { useState, useRef } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FilePlus,
  Save,
  FolderOpen,
  HelpCircle,
  Info,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';

type PendingAction = 'new' | 'load' | null;

export function Sidebar() {
  const {
    hasProjectData,
    hasUnsavedChanges,
    resetAll,
    getProjectData,
    loadProjectData,
    markAsSaved,
    planningData,
    detectedTier,
    apiKeyValid,
  } = useAppState();

  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle New Project
  const handleNewProject = () => {
    if (hasUnsavedChanges()) {
      setPendingAction('new');
      setShowConfirmDialog(true);
    } else if (hasProjectData()) {
      // Has data but saved - still confirm
      setPendingAction('new');
      setShowConfirmDialog(true);
    } else {
      // No data, just reset
      resetAll();
    }
  };

  // Handle Save Project
  const handleSaveProject = () => {
    const data = getProjectData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const bookTitle = planningData?.book_overview?.title || 'project';
    const safeName = bookTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const filename = `appendix_${safeName}_${new Date().toISOString().split('T')[0]}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    markAsSaved();
  };

  // Handle Load Project click
  const handleLoadClick = () => {
    if (hasUnsavedChanges()) {
      setPendingAction('load');
      setShowConfirmDialog(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    if (hasUnsavedChanges() && pendingAction !== 'load') {
      setPendingFile(file);
      setPendingAction('load');
      setShowConfirmDialog(true);
      return;
    }

    await loadFile(file);
  };

  // Load the file
  const loadFile = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || !data.bookContent) {
        alert('Invalid project file format');
        return;
      }

      loadProjectData(data);
      setIsOpen(false);
    } catch {
      alert('Failed to load project file. Please check the file format.');
    }
  };

  // Handle confirm dialog actions
  const handleConfirmSaveAndProceed = () => {
    handleSaveProject();
    proceedWithAction();
  };

  const handleConfirmDiscard = () => {
    proceedWithAction();
  };

  const handleConfirmCancel = () => {
    setShowConfirmDialog(false);
    setPendingAction(null);
    setPendingFile(null);
  };

  const proceedWithAction = () => {
    setShowConfirmDialog(false);

    if (pendingAction === 'new') {
      resetAll();
    } else if (pendingAction === 'load') {
      if (pendingFile) {
        loadFile(pendingFile);
        setPendingFile(null);
      } else {
        fileInputRef.current?.click();
      }
    }

    setPendingAction(null);
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-md border hover:bg-gray-50 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <span className="font-semibold text-gray-700">File</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* File Actions */}
          <div className="p-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleNewProject}
            >
              <FilePlus className="w-4 h-4 mr-2" />
              New Project
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleSaveProject}
              disabled={!hasProjectData()}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Project
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLoadClick}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Load Project
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="border-t mx-4" />

          {/* Help & About */}
          <div className="p-4 flex-1">
            <Accordion type="single" collapsible>
              <AccordionItem value="help">
                <AccordionTrigger className="text-sm">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Quick Help
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium">Workflow:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>
                        <strong>API Setup</strong> - Get free key from{' '}
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
                      <li>
                        <strong>Upload Book</strong> - Upload PDF and extract content
                      </li>
                      <li>
                        <strong>Analyze</strong> - AI creates planning table
                      </li>
                      <li>
                        <strong>Generate</strong> - Create appendices for chapters
                      </li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="about">
                <AccordionTrigger className="text-sm">
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    About
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium">Appendix Generator v2.0</p>
                    <hr className="my-2" />
                    <p>
                      <strong>Creator:</strong> Elias Pierrakos
                    </p>
                    <p>
                      <strong>Organization:</strong> eLearning EKPA
                    </p>
                    <p>
                      <strong>Scientific Supervisor:</strong> Panagiotis Petrakis
                    </p>
                    <hr className="my-2" />
                    <p className="italic">Made with Google Antigravity</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Model Info */}
          {apiKeyValid && (
            <div className="p-4 border-t text-xs text-muted-foreground">
              Tier: {detectedTier === 'paid' ? 'Paid' : 'Free'}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hasUnsavedChanges() ? 'Unsaved Changes' : 'Confirm Action'}
            </DialogTitle>
            <DialogDescription>
              {hasUnsavedChanges()
                ? `You have unsaved changes. Do you want to save before you ${
                    pendingAction === 'new' ? 'create a new project' : 'load another project'
                  }?`
                : `Are you sure you want to ${
                    pendingAction === 'new' ? 'create a new project' : 'load another project'
                  }? Your current project will be closed.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            {hasUnsavedChanges() ? (
              <>
                <Button variant="outline" onClick={handleConfirmCancel}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleConfirmDiscard}>
                  Discard Changes
                </Button>
                <Button onClick={handleConfirmSaveAndProceed}>
                  Save & Continue
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleConfirmCancel}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmDiscard}>
                  Continue
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
