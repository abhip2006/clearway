'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Upload, FileCheck, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  link?: string;
}

interface OnboardingChecklistProps {
  userId: string;
  hasDocuments?: boolean;
  hasApprovedDocuments?: boolean;
  hasTeamMembers?: boolean;
}

export function OnboardingChecklist({
  userId,
  hasDocuments = false,
  hasApprovedDocuments = false,
  hasTeamMembers = false,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const [viewedCalendar, setViewedCalendar] = useState(false);

  useEffect(() => {
    // Check if checklist was dismissed
    const isDismissed = localStorage.getItem(`onboarding-dismissed-${userId}`);
    if (isDismissed === 'true') {
      setDismissed(true);
    }

    // Check if user has viewed calendar
    const hasViewedCalendar = localStorage.getItem(`onboarding-calendar-${userId}`);
    if (hasViewedCalendar === 'true') {
      setViewedCalendar(true);
    }
  }, [userId]);

  const handleDismiss = () => {
    localStorage.setItem(`onboarding-dismissed-${userId}`, 'true');
    setDismissed(true);
  };

  const handleCalendarClick = () => {
    localStorage.setItem(`onboarding-calendar-${userId}`, 'true');
    setViewedCalendar(true);
  };

  const items: ChecklistItem[] = [
    {
      id: 'upload',
      title: 'Upload your first document',
      description: 'Upload a capital call PDF to get started',
      icon: <Upload className="h-5 w-5" />,
      completed: hasDocuments,
      link: '/upload',
    },
    {
      id: 'review',
      title: 'Review and approve extraction',
      description: 'Review AI-extracted data and approve it',
      icon: <FileCheck className="h-5 w-5" />,
      completed: hasApprovedDocuments,
      link: hasDocuments && !hasApprovedDocuments ? '/upload' : undefined,
    },
    {
      id: 'calendar',
      title: 'View calendar',
      description: 'Check out your capital call calendar',
      icon: <Calendar className="h-5 w-5" />,
      completed: viewedCalendar,
      link: '/dashboard/calendar',
    },
    {
      id: 'team',
      title: 'Invite team member',
      description: 'Add teammates to collaborate',
      icon: <Users className="h-5 w-5" />,
      completed: hasTeamMembers,
      link: '/dashboard/team',
    },
  ];

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progress = (completedCount / totalCount) * 100;
  const isComplete = completedCount === totalCount;

  if (dismissed) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">
              {isComplete ? 'Welcome aboard!' : 'Get Started with Clearway'}
            </CardTitle>
            <CardDescription className="mt-1">
              {isComplete
                ? 'You've completed all onboarding steps!'
                : `Complete these steps to get the most out of Clearway`}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {completedCount} of {totalCount} completed
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg transition-colors',
                item.completed ? 'bg-green-50 dark:bg-green-950/20' : 'bg-muted/50',
                item.link && !item.completed && 'hover:bg-muted cursor-pointer'
              )}
              onClick={() => {
                if (item.link && !item.completed) {
                  if (item.id === 'calendar') {
                    handleCalendarClick();
                  }
                  window.location.href = item.link;
                }
              }}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0',
                  item.completed
                    ? 'bg-green-600 text-white'
                    : 'bg-background border-2 border-muted-foreground/20'
                )}
              >
                {item.completed ? (
                  <Check className="h-4 w-4" />
                ) : (
                  item.icon
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn('font-medium text-sm', item.completed && 'line-through')}>
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </div>

              {item.link && !item.completed && (
                <Link
                  href={item.link}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.id === 'calendar') {
                      handleCalendarClick();
                    }
                  }}
                  className="text-sm text-primary hover:underline flex-shrink-0"
                >
                  Go
                </Link>
              )}
            </div>
          ))}
        </div>

        {isComplete && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-900 dark:text-green-100 text-center">
              🎉 Congratulations! You're all set up and ready to manage your capital calls.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
