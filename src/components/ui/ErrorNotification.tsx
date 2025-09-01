import React, { useEffect } from 'react';
import { useAtom } from 'jotai';
import { loadingAtom } from '@/store/loading';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const ErrorNotification: React.FC = () => {
  const [loading, setLoading] = useAtom(loadingAtom);
  const { t } = useTranslation();

  useEffect(() => {
    if (loading.shouldShowErrors && loading.fetchErrors.length > 0) {
      const recentErrors = loading.fetchErrors.filter(
        error => Date.now() - error.timestamp < 10000 // Show errors from last 10 seconds
      );

      if (recentErrors.length > 0) {
        const totalRequests = loading.loadingProgress.total || recentErrors.length;
        const failedCount = loading.loadingProgress.failed || recentErrors.length;
        const failureRate = failedCount / totalRequests;

        // Determine notification type based on failure rate
        if (failureRate > 0.5) {
          // Majority failed - likely rate limit
          toast.error(
            t('loading.Rate limit exceeded. Please try again in 1-2 minutes.'),
            {
              duration: 8000,
              position: 'top-right',
              icon: '⏰',
            }
          );
        } else if (failureRate > 0.1) {
          // Some failures - partial data
          toast.error(
            t('loading.Some data could not be loaded. Showing available information.'),
            {
              duration: 6000,
              position: 'top-right',
              icon: '⚠️',
            }
          );
        } else {
          // Few failures - minor issue
          toast.error(
            t('loading.Minor connection issues detected. Data may be incomplete.'),
            {
              duration: 4000,
              position: 'top-right',
              icon: '📡',
            }
          );
        }

        // Clear the error notification flag and old errors
        setLoading(prev => ({
          ...prev,
          shouldShowErrors: false,
          fetchErrors: prev.fetchErrors.filter(
            error => Date.now() - error.timestamp < 300000 // Keep errors for 5 minutes for debugging
          )
        }));
      }
    }
  }, [loading.shouldShowErrors, loading.fetchErrors, loading.loadingProgress, setLoading, t]);

  return null; // This component doesn't render anything
};

export default ErrorNotification;
