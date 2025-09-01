import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import { useTranslation } from 'react-i18next';

interface LoadingOverlayProps {
  isVisible: boolean;
  progress?: {
    current: number;
    total: number;
    message: string;
    failed?: number;
    succeeded?: number;
  };
  title?: string;
  description?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isVisible, 
  progress,
  title = "Loading...",
  description = "Please wait while we fetch the latest data"
}) => {
  const { t } = useTranslation();
  
  // Debug progress values
  React.useEffect(() => {
    if (progress && progress.total > 0) {
      const percentage = (progress.current / progress.total) * 100;
      console.log('[LoadingOverlay] Progress:', {
        current: progress.current,
        total: progress.total,
        percentage: percentage,
        message: progress.message
      });
    }
  }, [progress]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="max-w-md w-full mx-4 bg-card border-foreground rounded-lg shadow-xl p-6"
          >
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <LoadingSpinner size="lg" />
              </div>
              
              <h3 className="text-lg font-semibold mb-2">
                {t(title)}
              </h3>
              
              <p className="text-sm mb-4">
                {t(description)}
              </p>

              {progress && progress.total > 0 && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ease-out ${
                        (progress.failed || 0) > 0 && (progress.succeeded || 0) > 0 
                          ? 'bg-yellow-500' // Partial success
                          : (progress.failed || 0) > 0 
                          ? 'bg-red-500'    // Failed
                          : 'bg-blue-600'   // Success
                      }`}
                      style={{ 
                        width: `${Math.min(100, Math.max(0, (progress.current / progress.total) * 100))}%` 
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>{progress.message}</p>
                    <div className="flex justify-between">
                      <span>Progress: {progress.current}/{progress.total}</span>
                      {((progress.succeeded || 0) > 0 || (progress.failed || 0) > 0) && (
                        <span className="text-right">
                          {(progress.failed || 0) > 0 ? (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              ⚠️ Some issues
                            </span>
                          ) : (progress.succeeded || 0) > 0 ? (
                            <span className="text-green-600 dark:text-green-400">
                              ✓ Loading
                            </span>
                          ) : null}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingOverlay;
