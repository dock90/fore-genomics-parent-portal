"use client";

import { useState, useEffect } from 'react';
import { InlineWidget } from 'react-calendly';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, X, Loader2 } from 'lucide-react';

interface CalendlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'pre-test' | 'post-test';
  userEmail?: string;
  userName?: string;
}

export default function CalendlyModal({ isOpen, onClose, type, userEmail, userName }: CalendlyModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [schedulingUrl, setSchedulingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch scheduling URL when modal opens
  useEffect(() => {
    if (isOpen && !schedulingUrl) {
      fetchSchedulingUrl();
    }
  }, [isOpen, type]);

  const fetchSchedulingUrl = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/calendly/scheduling-url?type=${type}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get scheduling URL');
      }
      
      setSchedulingUrl(data.schedulingUrl);
    } catch (err) {
      console.error('Error fetching scheduling URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scheduling form');
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-fill form data
  const prefillData = {
    email: userEmail || '',
    name: userName || '',
    // Add any other prefill fields you want
  };

  const title = type === 'pre-test' 
    ? 'Schedule Pre-Test Genetic Counseling' 
    : 'Schedule Post-Test Genetic Counseling';

  const description = type === 'pre-test'
    ? 'Book your pre-test genetic counseling session to discuss the testing process and what to expect.'
    : 'Book your post-test genetic counseling session to discuss your results and next steps.';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading scheduling form...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={fetchSchedulingUrl} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          )}
          
          {schedulingUrl && !isLoading && !error && (
            <InlineWidget
              url={schedulingUrl}
              styles={{
                height: '600px',
                width: '100%',
              }}
              prefill={prefillData}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 