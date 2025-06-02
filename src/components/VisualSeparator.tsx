'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface VisualSeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  gradient?: string;
  className?: string;
  animate?: boolean;
}

const VisualSeparator: React.FC<VisualSeparatorProps> = ({
  orientation = 'horizontal',
  gradient = 'from-blue-500 to-purple-600',
  className = '',
  animate = true,
}) => {
  const baseClasses = orientation === 'horizontal' 
    ? 'w-full h-1' 
    : 'w-1 h-full';

  return (
    <div
      className={`${baseClasses} bg-gradient-to-r ${gradient} rounded-full ${className}`}
    />
  );
};

export default VisualSeparator;