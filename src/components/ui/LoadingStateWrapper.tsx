import React from 'react';
import { useAtom } from 'jotai';
import { loadingAtom } from '@/store/loading';
import SkeletonLoader from './SkeletonLoader';
import LoadingSpinner from './LoadingSpinner';

interface LoadingStateWrapperProps {
  children: React.ReactNode;
  isLoading?: boolean;
  hasData?: boolean;
  variant?: 'card' | 'table' | 'chart' | 'text';
  lines?: number;
  className?: string;
  showGlobalLoading?: boolean;
  showSpinner?: boolean;
}

const LoadingStateWrapper: React.FC<LoadingStateWrapperProps> = ({
  children,
  isLoading = false,
  hasData = true,
  variant = 'card',
  lines = 3,
  className = '',
  showGlobalLoading = true,
  showSpinner = false
}) => {
  const [loading] = useAtom(loadingAtom);
  
  const shouldShowLoading = isLoading || (showGlobalLoading && (loading.isEpochDataLoading || loading.isInitialLoading));
  const shouldShowSkeleton = shouldShowLoading && !hasData;

  if (shouldShowSkeleton) {
    if (showSpinner) {
      return (
        <div className={`flex items-center justify-center p-8 ${className}`}>
          <LoadingSpinner size="lg" />
        </div>
      );
    }
    
    return <SkeletonLoader variant={variant} lines={lines} className={className} />;
  }

  return <>{children}</>;
};

export default LoadingStateWrapper;
