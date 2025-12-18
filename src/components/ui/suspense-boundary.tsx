'use client';

import { Suspense, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface SuspenseBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function SuspenseBoundary({ children, fallback }: SuspenseBoundaryProps) {
  const defaultFallback = (
    <div className="flex justify-center items-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return <Suspense fallback={fallback || defaultFallback}>{children}</Suspense>;
}

