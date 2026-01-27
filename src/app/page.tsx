'use client';

import { useState } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { Stepper } from '@/components/Stepper';
import { Sidebar } from '@/components/Sidebar';
import { ApiSetup } from '@/components/steps/ApiSetup';
import { UploadBook } from '@/components/steps/UploadBook';
import { AnalyzeReview } from '@/components/steps/AnalyzeReview';
import { Generate } from '@/components/steps/Generate';
import { BookOpen } from 'lucide-react';

export default function Home() {
  const { currentStep } = useAppState();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <ApiSetup />;
      case 2:
        return <UploadBook />;
      case 3:
        return <AnalyzeReview />;
      case 4:
        return <Generate />;
      default:
        return <ApiSetup />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content - shifts when sidebar is open */}
      <div
        className={`transition-all duration-200 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}
      >
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-blue-600" />
                <div className="text-center">
                  <h1 className="text-xl font-bold text-gray-900">Appendix Generator</h1>
                  <p className="text-sm text-gray-500">
                    AI-powered future-oriented appendices for academic books
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Stepper />
          {renderStep()}
        </main>

        {/* Footer */}
        <footer className="mt-auto py-6 text-center text-sm text-gray-500">
          <p>
            PDF processing happens in your browser. Your content never leaves your device.
          </p>
          <p className="mt-1">
            AI calls are proxied securely. Your API key is protected.
          </p>
        </footer>
      </div>
    </div>
  );
}
