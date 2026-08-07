import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = "default", message = "Loading...", showLogo = true }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode preference
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeQuery.matches);
    
    const handleChange = (e) => setIsDarkMode(e.matches);
    darkModeQuery.addEventListener('change', handleChange);
    
    return () => darkModeQuery.removeEventListener('change', handleChange);
  }, []);

  // Size configurations
  const sizeConfig = {
    small: {
      container: "py-4",
      spinner: "h-6 w-6",
      logo: "w-8 h-8",
      text: "text-sm"
    },
    default: {
      container: "py-8",
      spinner: "h-8 w-8", 
      logo: "w-10 h-10",
      text: "text-base"
    },
    large: {
      container: "py-12",
      spinner: "h-12 w-12",
      logo: "w-16 h-16", 
      text: "text-lg"
    },
    fullscreen: {
      container: "min-h-screen",
      spinner: "h-16 w-16",
      logo: "w-20 h-20",
      text: "text-xl"
    }
  };

  const config = sizeConfig[size];
  const isFullscreen = size === 'fullscreen';

  const SpinnerComponent = () => (
    <div className="relative">
      {/* Outer spinning ring */}
      <div
        className={`animate-spin rounded-full border-4 border-transparent ${config.spinner}`}
        style={{
          borderTopColor: isDarkMode ? '#60a5fa' : '#3b82f6',
          borderRightColor: isDarkMode ? '#34d399' : '#06d6a0',
          animationDuration: '1s'
        }}
      />
      
      {/* Inner pulsing dot */}
      <div
        className={`absolute inset-0 rounded-full animate-pulse ${
          size === 'small' ? 'border-2' : size === 'large' || size === 'fullscreen' ? 'border-6' : 'border-4'
        }`}
        style={{
          borderColor: isDarkMode ? '#1e293b' : '#f1f5f9',
          backgroundColor: isDarkMode ? '#0f172a' : '#ffffff'
        }}
      />
      
      {/* Center dot */}
      <div
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full ${
          size === 'small' ? 'w-1 h-1' : 
          size === 'large' ? 'w-3 h-3' :
          size === 'fullscreen' ? 'w-4 h-4' : 'w-2 h-2'
        }`}
        style={{
          backgroundColor: isDarkMode ? '#60a5fa' : '#3b82f6'
        }}
      />
    </div>
  );

  if (isFullscreen) {
    return (
      <div className={`flex flex-col items-center justify-center ${config.container} ${
        isDarkMode ? 'bg-slate-900' : 'bg-gray-50'
      }`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center space-y-6"
        >
          {showLogo && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`flex items-center justify-center ${config.logo} rounded-full p-3 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-slate-800 to-slate-700' 
                  : 'bg-gradient-to-br from-blue-50 to-cyan-50'
              } shadow-lg`}
            >
              <img
                src="https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/payana-logo.png"
                alt="Payana Logo"
                className="w-full h-full object-contain"
              />
            </motion.div>
          )}
          
          <SpinnerComponent />
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <p className={`${config.text} font-medium ${
              isDarkMode ? 'text-slate-200' : 'text-gray-700'
            }`}>
              {message}
            </p>
            <p className={`text-sm mt-1 ${
              isDarkMode ? 'text-slate-400' : 'text-gray-500'
            }`}>
              Payana Overseas Solutions
            </p>
          </motion.div>
          
          {/* Animated dots */}
          <motion.div 
            className="flex space-x-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
                }`}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col items-center justify-center ${config.container}`}
    >
      {showLogo && size !== 'small' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex items-center justify-center ${config.logo} rounded-full p-2 mb-4 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-slate-800 to-slate-700' 
              : 'bg-gradient-to-br from-blue-50 to-cyan-50'
          } shadow-sm`}
        >
          <img
            src="https://settlo-invoices.s3.ap-south-1.amazonaws.com/assets/payana-logo.png"
            alt="Payana Logo"
            className="w-full h-full object-contain"
          />
        </motion.div>
      )}
      
      <SpinnerComponent />
      
      {message && size !== 'small' && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`mt-4 ${config.text} font-medium ${
            isDarkMode ? 'text-slate-300' : 'text-gray-600'
          }`}
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
};

export default LoadingSpinner;
