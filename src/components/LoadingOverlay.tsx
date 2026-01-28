'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isOpen: boolean;
  message: string;
  subMessage?: string;
}

export function LoadingOverlay({ isOpen, message, subMessage }: LoadingOverlayProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">{message}</p>
            {subMessage && (
              <p className="text-sm text-muted-foreground">{subMessage}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Elapsed: {formatTime(elapsedSeconds)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
