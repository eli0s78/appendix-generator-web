'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';

interface LoadingOverlayProps {
  isOpen: boolean;
  message: string;
  subMessage?: string;
  onCancel?: () => void;
}

export function LoadingOverlay({ isOpen, message, subMessage, onCancel }: LoadingOverlayProps) {
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
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              className="mt-2"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
