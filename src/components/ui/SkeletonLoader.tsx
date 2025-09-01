import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  className?: string;
  lines?: number;
  variant?: 'text' | 'card' | 'table' | 'chart';
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  className = '', 
  lines = 3, 
  variant = 'text' 
}) => {
  const shimmer = {
    initial: { backgroundPosition: "-200px 0" },
    animate: { backgroundPosition: "calc(200px + 100%) 0" },
  };

  const transition = {
    duration: 2,
    repeat: Infinity,
    ease: "linear"
  };

  if (variant === 'card') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${className}`}>
        <motion.div
          className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded mb-4"
          style={{
            backgroundSize: "200px 100%",
            backgroundRepeat: "no-repeat",
          }}
          variants={shimmer}
          initial="initial"
          animate="animate"
          transition={transition}
        />
        <motion.div
          className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded mb-2 w-3/4"
          style={{
            backgroundSize: "200px 100%",
            backgroundRepeat: "no-repeat",
          }}
          variants={shimmer}
          initial="initial"
          animate="animate"
          transition={{ ...transition, delay: 0.1 }}
        />
        <motion.div
          className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded w-1/2"
          style={{
            backgroundSize: "200px 100%",
            backgroundRepeat: "no-repeat",
          }}
          variants={shimmer}
          initial="initial"
          animate="animate"
          transition={{ ...transition, delay: 0.2 }}
        />
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="flex space-x-4">
            <motion.div
              className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded flex-1"
              style={{
                backgroundSize: "200px 100%",
                backgroundRepeat: "no-repeat",
              }}
              variants={shimmer}
              initial="initial"
              animate="animate"
              transition={{ ...transition, delay: index * 0.1 }}
            />
            <motion.div
              className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded w-24"
              style={{
                backgroundSize: "200px 100%",
                backgroundRepeat: "no-repeat",
              }}
              variants={shimmer}
              initial="initial"
              animate="animate"
              transition={{ ...transition, delay: index * 0.1 + 0.05 }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={`${className}`}>
        <motion.div
          className="h-64 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-lg"
          style={{
            backgroundSize: "200px 100%",
            backgroundRepeat: "no-repeat",
          }}
          variants={shimmer}
          initial="initial"
          animate="animate"
          transition={transition}
        />
      </div>
    );
  }

  // Default text variant
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <motion.div
          key={index}
          className={`h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
          style={{
            backgroundSize: "200px 100%",
            backgroundRepeat: "no-repeat",
          }}
          variants={shimmer}
          initial="initial"
          animate="animate"
          transition={{ ...transition, delay: index * 0.1 }}
        />
      ))}
    </div>
  );
};

export default SkeletonLoader;
