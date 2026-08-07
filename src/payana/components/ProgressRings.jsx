import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ProgressRing = ({ 
  progress, 
  size = 120, 
  strokeWidth = 8, 
  color = null, 
  showPercentage = true,
  label = "",
  icon = null,
  animated = true
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Detect dark mode preference
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);
    
    const handleChange = (e) => setIsDarkMode(e.matches);
    darkModeQuery.addEventListener('change', handleChange);
    
    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  // Animate progress
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedProgress(progress);
    }
  }, [progress, animated]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedProgress / 100) * circumference;

  // Default color scheme based on progress
  const getProgressColor = () => {
    if (color) return color;
    
    if (isDarkMode) {
      if (progress >= 80) return '#22c55e'; // green
      if (progress >= 60) return '#3b82f6'; // blue
      if (progress >= 40) return '#f59e0b'; // yellow
      return '#ef4444'; // red
    } else {
      if (progress >= 80) return '#10b981'; // emerald
      if (progress >= 60) return '#06d6a0'; // cyan
      if (progress >= 40) return '#fbbf24'; // amber
      return '#f87171'; // red
    }
  };

  const progressColor = getProgressColor();
  const backgroundRingColor = isDarkMode ? '#374151' : '#e5e7eb';

  return (
    <div className="relative inline-block">
      <motion.div
        initial={animated ? { scale: 0.8, opacity: 0 } : {}}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={backgroundRingColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            className="opacity-30"
          />
          
          {/* Progress ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#gradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: animated ? 1.5 : 0, ease: "easeInOut" }}
            strokeLinecap="round"
            className="drop-shadow-sm"
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={progressColor} />
              <stop offset="100%" stopColor={progressColor} stopOpacity="0.7" />
            </linearGradient>
          </defs>
          
          {/* Glow effect */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={1}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="opacity-30"
            style={{ filter: 'blur(2px)' }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {icon && (
            <motion.div
              initial={animated ? { scale: 0 } : {}}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className={`mb-1 ${
                size < 100 ? 'w-4 h-4' : size < 150 ? 'w-5 h-5' : 'w-6 h-6'
              }`}
              style={{ color: progressColor }}
            >
              {icon}
            </motion.div>
          )}
          
          {showPercentage && (
            <motion.span
              initial={animated ? { opacity: 0, scale: 0.5 } : {}}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              className={`font-bold ${
                isDarkMode ? 'text-slate-100' : 'text-gray-800'
              } ${
                size < 100 ? 'text-sm' : size < 150 ? 'text-lg' : 'text-xl'
              }`}
            >
              {Math.round(animatedProgress)}%
            </motion.span>
          )}
          
          {label && !showPercentage && (
            <motion.span
              initial={animated ? { opacity: 0 } : {}}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              className={`font-medium text-center ${
                isDarkMode ? 'text-slate-200' : 'text-gray-700'
              } ${
                size < 100 ? 'text-xs' : 'text-sm'
              }`}
            >
              {label}
            </motion.span>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const PayanaProgressRings = ({ data, title = "", showTitle = true }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode preference
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);
    
    const handleChange = (e) => setIsDarkMode(e.matches);
    darkModeQuery.addEventListener('change', handleChange);
    
    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`p-6 rounded-xl shadow-sm ${
        isDarkMode ? 'bg-slate-800' : 'bg-white'
      }`}
    >
      {showTitle && title && (
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`text-lg font-semibold mb-6 text-center ${
            isDarkMode ? 'text-slate-100' : 'text-gray-900'
          }`}
        >
          {title}
        </motion.h3>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-items-center">
        {data.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index, duration: 0.5 }}
            className="text-center space-y-3"
          >
            <PayanaProgressRing 
              progress={item.progress} 
              color={item.color}
              size={item.size || 120}
              strokeWidth={item.strokeWidth || 8}
              icon={item.icon}
              animated={item.animated !== false}
              showPercentage={item.showPercentage !== false}
            />
            
            {item.label && (
              <div className="space-y-1">
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-slate-200' : 'text-gray-700'
                }`}>
                  {item.label}
                </p>
                {item.description && (
                  <p className={`text-xs ${
                    isDarkMode ? 'text-slate-400' : 'text-gray-500'
                  }`}>
                    {item.description}
                  </p>
                )}
                {item.value && (
                  <p className={`text-lg font-bold ${
                    isDarkMode ? 'text-slate-100' : 'text-gray-900'
                  }`}>
                    {item.value}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// Preset configurations for common Payana use cases
export const PayanaInvoiceProgress = ({ 
  paidPercentage, 
  pendingPercentage, 
  overduePercentage,
  totalRevenue 
}) => {
  const progressData = [
    {
      progress: paidPercentage,
      label: "Paid Invoices",
      color: "#22c55e",
      description: "Successfully paid",
      value: `${paidPercentage}%`
    },
    {
      progress: pendingPercentage,
      label: "Pending Invoices", 
      color: "#f59e0b",
      description: "Awaiting payment",
      value: `${pendingPercentage}%`
    },
    {
      progress: overduePercentage,
      label: "Overdue Invoices",
      color: "#ef4444", 
      description: "Past due date",
      value: `${overduePercentage}%`
    }
  ];

  return (
    <PayanaProgressRings 
      data={progressData}
      title="Invoice Status Overview"
    />
  );
};

export default ProgressRings;
