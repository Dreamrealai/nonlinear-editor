/**
 * TourLauncher Component
 *
 * Provides UI to manually start onboarding tours
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { HelpCircle, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { OnboardingTour } from './OnboardingTour';
import { ALL_TOURS, EDITOR_TOUR } from '@/types/onboarding';
import type { OnboardingTour as OnboardingTourType } from '@/types/onboarding';

interface TourLauncherProps {
  className?: string;
}

export function TourLauncher({ className }: TourLauncherProps): JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTour, setActiveTour] = useState<OnboardingTourType | null>(null);

  const handleStartTour = (tour: OnboardingTourType): void => {
    setActiveTour(tour);
    setIsMenuOpen(false);
  };

  const handleCompleteTour = (): void => {
    setActiveTour(null);
  };

  const handleSkipTour = (): void => {
    setActiveTour(null);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={(): void => setIsMenuOpen(true)}
        className={className}
        title="Get Started"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="ml-2 hidden sm:inline">Help</span>
      </Button>

      {/* Tour Menu Dialog */}
      <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Interactive Tours</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Learn how to use the video editor with interactive guided tours.
            </p>

            {ALL_TOURS.map((tour): JSX.Element => (
              <div
                key={tour.id}
                className="flex items-start gap-3 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{tour.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{tour.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {tour.steps.length} steps • ~{Math.ceil(tour.steps.length * 0.5)} min
                  </p>
                </div>
                <Button size="sm" onClick={(): void => handleStartTour(tour)}>
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Tour */}
      {activeTour && (
        <OnboardingTour tour={activeTour} onComplete={handleCompleteTour} onSkip={handleSkipTour} />
      )}
    </>
  );
}

/**
 * EditorTourLauncher Component
 *
 * Auto-starts the editor tour for first-time users
 */
export function EditorTourLauncher(): JSX.Element | null {
  const [tourCompleted, setTourCompleted] = useState(false);

  if (tourCompleted) {
    return null;
  }

  return <OnboardingTour tour={EDITOR_TOUR} onComplete={(): void => setTourCompleted(true)} onSkip={(): void => setTourCompleted(true)} />;
}
